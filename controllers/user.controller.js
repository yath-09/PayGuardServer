import User from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken'
import { errorHandler } from "../utils/error.js";

export const test = (req, res) => {
  res.json({ message: 'API is working!' });
};

export const signUpUser=async(req,res)=>{
  const {userName,phoneNumber,pin}=req.body;
  if(!userName || !phoneNumber || !pin ) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const existingUser=await User.findOne({phoneNumber})
    if(existingUser){
      return res.status(400).json({ message: 'User already exists' });
    }
    const user=await User.create({
      userName,phoneNumber,pin,
    })
    //creating the token
    // const token=jwt.sign({id:user._id},process.env.JWT_SECRET,{
    //   expiresIn:'1h',
    // })

    res.status(201).json({
      message:"User created Succesfully"
    });


  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
}

//fucntion for generating access and referesh token. same cam be found in model for user 
const generateAccessAndRefreshToken=async(userId)=>{
   try {
      const user=await User.findById(userId);
      //now generating the tokens
      const accessToken=user.generateAccessToken();
      const refreshToken=user.generateRefreshToken();
      // setting the token in user db 
      user.refreshToken=refreshToken;
      await user.save({validateBeforeSave:false})

      return {accessToken,refreshToken}
   } catch (error) {
     errorHandler(400,"Something went wrong while generating the tokens")
   }
}


export const signInUser=async(req,res)=>{
    const {phoneNumber,pin}=req.body;

    if(!phoneNumber || !pin) return res.status(400).json({message:"Missing required fields"})
    try {
       const user=await User.findOne({phoneNumber});
       //check if user is there or not
       if(!user){return res.status(404).json({message:"User not found"})}
       
       //checking the pin
       const isPinMatched=await user.comparePin(pin);
       if(!isPinMatched) return res.status(400).json({message:"Invalid pin"})
      
      //now assigning the tokens to  the user using access and refersh tokens
      const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id);
      const loggedInUser=await User.findById(user._id).select("-pin -refreshToken")
      //for storing it in cookies 
      const options = {
        httpOnly: true,
        secure: true
      }
      return res.status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",refreshToken,options)
      .json({message:"User signed in Succesfully"})
    
    } catch (error) {
      res.status(500).json({message:'Somthing went wrong'})
    }
}
