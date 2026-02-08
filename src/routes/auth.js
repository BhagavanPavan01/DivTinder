const express = require("express");
const { validateSignupData } = require("../utils/validator");
const authRouter = express.Router();
const User = require("../models/user");
const bcrypt = require("bcrypt");


//============== User SignUp to our Database
authRouter.post("/Signup", async (req, res) => {
  
  try {
    
    // Validation of the data
    validateSignupData(req);
    const {firstName,lastName,emailId,password} = req.body;
    
    // Encryptin the password using the  hash function  in the bcrypt library...
    const passwordHash = await bcrypt.hash(password, 10);
    // console.log(passwordHash);       //  checking the password
    
    // Creating a new instance of the User model
    const user = new User({
      firstName,lastName,emailId,password: passwordHash,
    });
    
    await user.save();
    res.send("user Signup successfully..!");
  } catch (err) {
    res.status(400).send("Error to SignUp the user :" + err.message);
  }
});


//============== User Login to our Database

authRouter.post("/login",async(req,res) =>{
  try {
    const { emailId,password } = req.body;
    
    // using findOne method to check email are in my DB or not
    const user = await User.findOne({emailId: emailId});
    if(!user) {
      throw new Error("User not found...!");
    }
    
    // TO compare the user entered password and Db stores password
    const isPasswordValid = await user.validatePassword(password);
    if(isPasswordValid){
      // Creating a JWT Token or cookies -- it will come from the user Schema (/models/user.js)
      const token = await user.getJWT();
      //  console.log(token);     // To checking the User
      
      res.cookie("token", token, {expires: new Date(Date.now() + 7 * 3600000),});
      res.send("Login successfully...!");
    } else {
      throw new Error("Password is Incorrect...!")
    }
  } catch (err) {
    res.status(400).send("Error to Login the user :" + err.message);
  }
});

//============== User LogOut to our Database

authRouter.post("/logout" ,async (req, res) => {
  res.cookie("token",null,{
    expires : new Date(Date.now()),
  });
  res.send("logout successfully");
})


module.exports = authRouter;