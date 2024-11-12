import express, {Router } from "express";
import { signInUser, signUpUser } from "../controller/user.controller";


const router: Router = express.Router();

router.post("/signup",signUpUser)
router.post("/signin",signInUser)


export default router;
