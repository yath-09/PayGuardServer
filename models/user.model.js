import mongoose from 'mongoose';
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken"
const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
  pin: {
    type: String,
    required: true,
  },
  isPhoneVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  refreshToken: {
    type: String
  }
});

//will make the pin hash only in starting rather than evertime
userSchema.pre('save',async function (next) {
    if(this.isModified('pin')){
      this.pin=await bcrypt.hash(this.pin,10) //hashing the pin
    }
})
//method to compare the pin in signin process 
userSchema.methods.comparePin=async function (enteredPin) {
   return await bcrypt.compare(enteredPin,this.pin);
}

// generating the token function
userSchema.methods.generateAccessToken = function(){
  return jwt.sign({
          _id: this._id,
          phoneNumber: this.phoneNumber,  
      },
      process.env.ACCESS_TOKEN_SECRET,{
          expiresIn: process.env.ACCESS_TOKEN_EXPIRY
      }
  )
}
userSchema.methods.generateRefreshToken = function(){
  return jwt.sign({
          _id: this._id,     
      },
      process.env.REFRESH_TOKEN_SECRET,{
          expiresIn: process.env.REFRESH_TOKEN_EXPIRY
      }
  )
}

const User = mongoose.model('User', userSchema);

export default User;