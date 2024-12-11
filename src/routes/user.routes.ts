import express, {Router } from "express";
import { logoutUser, searchUser, signInUser, signUpUser } from "../controller/user.controller";
import { authenticateJwt } from "../middleware/authentication";
import { addMoney, getUserTransactionHistory, p2pTransfer, updateWalletLimit, walletBalance } from "../controller/transactions.controller";


const userRouter: Router = express.Router();

userRouter.post("/signup",signUpUser)
userRouter.post("/signin",signInUser)
userRouter.post("/addmoney", authenticateJwt, addMoney);
userRouter.post("/tranfermoney",authenticateJwt,p2pTransfer)
userRouter.post("/logout",authenticateJwt,logoutUser)
userRouter.get("/searchUser",authenticateJwt,searchUser)
userRouter.get("/getWalletBalance",authenticateJwt,walletBalance)
userRouter.get("/getTransactionHistory",authenticateJwt,getUserTransactionHistory)
userRouter.put("/updateWalletLimit",authenticateJwt,updateWalletLimit)
export default userRouter;
