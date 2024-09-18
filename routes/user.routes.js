import express from "express"
import {signInUser, signUpUser, test} from "../controllers/user.controller.js";


const router=express.Router();

router.get('/test',test)
router.post('/signup',signUpUser);
router.post('/signin',signInUser)
export default router