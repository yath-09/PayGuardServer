import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors'
import userRoutes from "./routes/user.routes.js"
dotenv.config(); // Load environment variables before using them
const app = express();
const port = process.env.PORT || 8000;


app.use(express.json());
//cors prevention
app.use(cors({ origin: process.env.CORS_ORIGIN,credentials:true }));

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    app.listen(port, () => console.log(`Server running on port: ${port}`));
  })
  .catch((err) => console.log(`MongoDB connection error: ${err}`));
 
app.get('/api', (req, res) => {
  const data = 'Hello PayGuard!';
  res.send(data);
});

//test api 
app.use('/api/user',userRoutes) //imp use instead if method
