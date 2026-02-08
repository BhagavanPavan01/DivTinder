const express =  require("express");
const requestRouter = express.Router();
const { userAuth } = require("../middlewares/auth");


// =============== Send Connection request Api using JWT Token Authentication

requestRouter.post("/sendConnectionRequest", userAuth , async (req,res) => {

  try{
    const user = req.user;
    res.send(user.lastName + " is Sent the Connection Request");

  }  catch (err) {
    res.status(400).send("Error :" + err.message);
  }
});


module.exports = requestRouter;

