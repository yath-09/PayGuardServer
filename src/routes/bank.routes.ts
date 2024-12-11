import express, {Router } from "express";
import { addBank, updateTransferLimit, userToUserTransfer } from "../controller/bank.controller";
import { authenticateJwt } from "../middleware/authentication";



const bankRouter: Router = express.Router();


bankRouter.post("/addbank",authenticateJwt,addBank)
bankRouter.post("/u2utransfer",authenticateJwt,userToUserTransfer)
bankRouter.put("/updateTransferLimit",authenticateJwt,updateTransferLimit)
export default bankRouter;