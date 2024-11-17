import express, {Router } from "express";
import { logoutUser, signInUser, signUpUser } from "../controller/user.controller";
import { authenticateJwt } from "../middleware/authentication";
import { addMoney, p2pTransfer } from "../controller/transactions.controller";


const userRouter: Router = express.Router();

userRouter.post("/signup",signUpUser)
userRouter.post("/signin",signInUser)
userRouter.post("/addmoney", authenticateJwt, addMoney);
userRouter.post("/tranfermoney",authenticateJwt,p2pTransfer)
userRouter.post("/logout",authenticateJwt,logoutUser)


export default userRouter;
