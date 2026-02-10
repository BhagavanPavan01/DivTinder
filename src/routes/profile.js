const express = require("express")
const { userAuth } = require("../middlewares/auth");
const profileRouter = express.Router();
const {validateEditProfileData} = require("../utils/validator");
const crypto = require("crypto");


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
    res.send(`${loggedInUser.firstName}, your profile updated successfully`);
  }catch(err){
    res.status(400).send("ERROR : " + err.message);
  }
});

// ======================= User Forgot Password

profileRouter.post("/profile/forgot", async (req, res) => {
  try {
    const { emailId } = req.body;

    const user = await User.findOne({ emailId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    // send email (example)
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
    console.log("Reset link:", resetLink);

    res.send({ message: "Password reset link sent" });

  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});



module.exports = profileRouter;