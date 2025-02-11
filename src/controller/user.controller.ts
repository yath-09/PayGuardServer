import { Request, Response } from "express";
import { PrismaClient, User } from "@prisma/client";
import { comparePin, hashPin } from "../services/hashedPassword";
import { generateToken } from "../services/generateTokens";
import { compare } from "bcryptjs";
import { AuthenticatedRequest } from "../middleware/authentication";
interface UserInput {
  userName: string;
  phoneNumber: string;
  pin: string;
}

const prisma = new PrismaClient();

export const signUpUser = async (req: Request, res: Response): Promise<any> => {
  if (!req.body) {
    res.status(400).json({ message: "Request body is missing." });
    return;
  }
  const { userName, phoneNumber, pin }: UserInput = req.body as unknown as UserInput;
  if (!userName) return res.status(400).json({ message: "No username provided" });
  if (!pin)  return res.status(400).json({ message: "No pin provided" });
  if (!phoneNumber) return res.status(400).json({ message: "No phoneNumber provided" });

  //check if the user already exists
  const isUserExists: User | null = await prisma.user.findFirst({
    where: { phoneNumber: phoneNumber },
  });

  if (isUserExists) {
    return res.status(400).json({ message: "User Already Exists" });
    throw new Error("User already exists");
  }
  // Hash the PIN before saving to the database
  const hashedPin: string = hashPin(pin);

  try {
    // Create a new user in the database
    const user = await prisma.user.create({
      data: {
        userName,
        phoneNumber,
        pin: hashedPin,
      },
    });

    //creating the balance field also when the user is created
    await prisma.balance.create({
      data: {
        userId: user.id, // Use the newly created user's ID
        amount: 0, // Starting balance is 0
        locked: 0, // Starting locked balance is 0
      },
    });

    //create tokens
    const token: string = generateToken({
      id: user.id,
      phoneNumber: user.phoneNumber
    });
    const options = {
      expires: new Date(Date.now() + 10 * 60 * 1000),
      httpOnly: true,
      secure: true,
    };

    res.cookie("access_token", token, options);
    // Send the tokens back to the user
    res.status(200).json({ userName, message: "Signed Up Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to sign up user" });
  }

}

// export const signInUser=async(req,res)=>{
//      res.status(400).message
// }

export const signInUser = async (req: any, res: any) => {
  if (!req.body) {
    res.status(400).json({ message: "Request body is missing." });
    return;
  }
  const { phoneNumber, pin }: UserInput = req.body as unknown as UserInput;

  if (!pin)  return res.status(400).json({ message: "No pin provided" });
  if (!phoneNumber) return res.status(400).json({ message: "No phoneNumber provided" });

  try {
    // Find the user in the database by phone number
    const user = await prisma.user.findUnique({ //add null for user 
      where: {
        phoneNumber,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" }) || "";
    }

    // Compare the entered PIN with the stored hashed PIN
    const isPinValid = await comparePin(pin, user.pin);

    if (!isPinValid) {
      return res.status(400).json({ message: "Invalid PIN" });
    }

    //create tokens
    const token: string = generateToken({
      id: user.id,
      phoneNumber: user.phoneNumber
    });
    const options = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: true,
    };

    res.cookie("access_token", token, options);
    res.status(200).json({ message: "Signed In Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to sign in user" });
  }
}


export const logoutUser = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  console.log(userId)

  try {
    const options = {
      httpOnly: true,
      secure: true,
      sameSight: "strict"
    };
    //clearing the cookies for the user 
    res
      .clearCookie("access_token", options).json({ message: "User Logout Succcesfully" })
  } catch (error) {
    console.log(error)
  }
}


export const searchUser = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const query = req.query.query as string;
    if (!query) {
      return res.status(400).json({ error: "Search query cannot be empty" });
    }
    const timeNow=Date.now();
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { userName: { contains: query, mode: 'insensitive' } },
          { phoneNumber: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        userName: true,
        phoneNumber: true,
        bankAccounts: {
          select: {
            upiId: true,
            bankName: true,
          },
        },
      },
    });
    const timeThen=Date.now();
    console.log("Time to fetch Users",timeThen-timeNow,"ms")

    if (users.length === 0) {
      return res.status(404).json({ error: "No users found" });
    }
    //ampping the user in the search results 
    const formattedUsers = users.flatMap((user) =>
      user.bankAccounts.map((account) => ({
        userName: user.userName,
        upiId: account.upiId,
      }))
    );

    res.status(200).json({
      message: "Search results",
      users: formattedUsers,
    });

  } catch (error) {
    console.error("Error searching for users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
