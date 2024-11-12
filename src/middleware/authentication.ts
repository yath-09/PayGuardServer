import { Response, Request, NextFunction } from "express";
import { verifyToken } from "../services/generateTokens";


interface AuthenticatedRequest extends Request {
  user?: { id: number; phoneNumber: string}; // Define the structure of user object based on your token
}

export const authenticateJwt = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies["access_token"];
    if (!token) {
      throw new Error("Not Authenticated. Please Login");
    }
    const user = verifyToken(token);
    if (!user) {
      throw new Error("Not Authenticated. Please Login");
    }
    req.user = user;
    next();
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};