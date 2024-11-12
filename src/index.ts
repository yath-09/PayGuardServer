import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
//import userRoutes from './routes/userRoutes';
import { PrismaClient } from '@prisma/client';


// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 8000;
const prisma = new PrismaClient();

// Middleware
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

// Routes

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});


//app.use('/api/user', router);
// Test route to add a user
app.get('/api/test-add-user', async (req, res) => {
    try {
      const newUser = await prisma.user.create({
        data: {
          userName: "TestUser",
          phoneNumber: "1234567890",
          pin: "hashedPin123",
        },
      });
      res.status(200).json(newUser);
    } catch (error) {
      console.error("Error adding user:", error);
      res.status(500).json({ error: "Failed to add user" });
    }
  });

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Close Prisma connection when the app is terminated
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
})
