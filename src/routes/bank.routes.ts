import express, {Router } from "express";
import { addBank } from "../controller/bank.controller";
import { authenticateJwt } from "../middleware/authentication";



const bankRouter: Router = express.Router();


bankRouter.post("/addbank",authenticateJwt,addBank)

export default bankRouter;