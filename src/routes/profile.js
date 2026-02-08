const express = require("express")
const { userAuth } = require("../middlewares/auth");
const profileRouter = express.Router();
const {validateEditProfileData} = require("../utils/validator");



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



module.exports = profileRouter;