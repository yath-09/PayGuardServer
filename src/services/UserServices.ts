// src/services/UserService.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

class UserService {
  static async createUser(data: { userName: string; phoneNumber: string; pin: string }) {
    const hashedPin = await bcrypt.hash(data.pin, 10);
    return prisma.user.create({
      data: {
        ...data,
        pin: hashedPin,
      },
    });
  }

  static async comparePin(storedPin: string, enteredPin: string): Promise<boolean> {
    return bcrypt.compare(enteredPin, storedPin);
  }

  static generateAccessToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        phoneNumber: user.phoneNumber,
      },
      process.env.ACCESS_TOKEN_SECRET as string,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
      }
    );
  }

  static generateRefreshToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
      },
      process.env.REFRESH_TOKEN_SECRET as string,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
      }
    );
  }
}

export default UserService;
