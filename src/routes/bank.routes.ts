import express, {Router } from "express";
import { addBank } from "../controller/bank.controller";



const bankRouter: Router = express.Router();


bankRouter.post("/addbank",addBank)

export default bankRouter;