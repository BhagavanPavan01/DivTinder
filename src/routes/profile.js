const express = require("express")
const { userAuth } = require("../middlewares/auth");
const profileRouter = express.Router();
const {validateEditProfileData} = require("../utils/validator");
const crypto = require("crypto");
const User = require("../models/user");
const bcrypt = require("bcrypt");


// =============== User Profile API to retrieve the user data from DB.
//                => userAuth is a middle ware it will check user authentication using the JWT Token

profileRouter.get("/profile/view",userAuth ,async(req,res) => {
  try{
    // Take the user data from ./middlewares/auth" 
    const user = req.user;
    res.send(user);
  }  catch (err) {
    res.status(400).send("Error :" + err.message);
  }
});


// ======================= User Profile data Editing

profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try{
    if (!validateEditProfileData(req)) {
      throw new Error ("Invalid Edit Request");
    }
    const loggedInUser = req.user;
    Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));
    await loggedInUser.save();
    res.send(`${loggedInUser.lastName}, your profile updated successfully`);
  }catch(err){
    res.status(400).send("ERROR : " + err.message);
  }
});

// ======================= User Forgot Password

profileRouter.post("/profile/forgot", async (req, res) => {
  try {
    const { emailId } = req.body;

    const user = await User.findOne({ emailId });

    // Always send same response (avoid email enumeration attack)
    if (!user) {
      return res.json({ message: "If this email exists, a reset link has been sent." });
    }

    // 1️ Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // 2️ Hash token before saving to DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 5 * 60 * 1000; // 5 min

    await user.save();

    // 3️ Create reset URL
    const resetURL = `http://localhost:3000/reset-password/${resetToken}`;

    console.log("Reset Link:", resetURL);

    // Todo: Send Email using nodemailer

    res.json({ message: "If this email exists, a reset link has been sent." });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// After calling the forgot api we required Reset api

profileRouter.post("/profile/reset/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Token invalid or expired" });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);

    // Clear reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = profileRouter;