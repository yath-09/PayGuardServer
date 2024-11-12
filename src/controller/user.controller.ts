import { Request, Response } from "express";
import { PrismaClient, User } from "@prisma/client";
import { hashPin } from "../services/hashedPassword";
import { generateToken } from "../services/generateTokens";
import { compare } from "bcryptjs";
interface UserInput {
  userName: string;
  phoneNumber: string;
  pin: string;
}

const prisma = new PrismaClient();

export const signUpUser = async (req: Request, res: Response): Promise<void> => {
  if (!req.body) {
    res.status(400).json({ message: "Request body is missing." });
    return;
  }
  const { userName, phoneNumber, pin }: UserInput = req.body as unknown as UserInput;
  if (!userName) throw new Error("No username provided")
  if (!pin) throw new Error("No pin provided")
  if (!phoneNumber) throw new Error("No phoneNumber provided")

  //check if the user already exists
  const isUserExists: User | null = await prisma.user.findFirst({
    where: { phoneNumber: phoneNumber },
  });

  if (isUserExists) {
    res.status(400).json({ message: "User Already Exists" });
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

export const signInUser = async (req:any, res:any) => {
  if (!req.body) {
    res.status(400).json({ message: "Request body is missing." });
    return;
  }
  const { phoneNumber, pin }: UserInput = req.body as unknown as UserInput;

  if (!pin) throw new Error("No pin provided")
  if (!phoneNumber) throw new Error("No phoneNumber provided")

  try {
    // Find the user in the database by phone number
    const user = await prisma.user.findUnique({ //add null for user 
      where: {
        phoneNumber,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" }) || "";
    }

    // Compare the entered PIN with the stored hashed PIN
    const isPinValid = compare(pin, user.pin);

    if (!isPinValid) {
      res.status(400).json({ error: "Invalid PIN" });
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
