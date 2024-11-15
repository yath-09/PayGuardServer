import express, {Router } from "express";
import { signInUser, signUpUser } from "../controller/user.controller";
import { authenticateJwt } from "../middleware/authentication";
import { addMoney } from "../controller/transactions.controller";


const router: Router = express.Router();

router.post("/signup",signUpUser)
router.post("/signin",signInUser)
router.post("/addmoney", authenticateJwt, addMoney);


export default router;
