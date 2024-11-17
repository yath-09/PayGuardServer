import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authentication";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


export const addBank = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
      
  };
  