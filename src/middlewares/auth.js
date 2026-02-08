const jwt = require("jsonwebtoken");
const User = require("../models/user");

const userAuth = async (req, res, next) => {
    // Read the tokens from req cookies
    try {
        const { token } = req.cookies;
        if (!token) {
            throw new Error("Invalid Token...!");
        }
        // validate the token
        const decodedData = await jwt.verify(token, "PavanDiveTinder@token$420");
        const { _id } = decodedData;
        // console.log("Logged In user is: " + _id);    // To check the user id in DB
 
        const user = await User.findById(_id);

   
        if (!user) {
            throw new Error("Please Try again...!");
        }
        req.user = user;
        next();
    } catch (err) {
        res.status(400).send("Error: " + err.message);
    }
};

module.exports = {
    userAuth
}



//=====================================================================
// const { adminAuth, userAuth } = require("./middlewares/auth");


// app.use("/admin",adminAuth,(req,res,next) => {
//     console.log("Admin is authorized")
//     res.send("All data fetched")
// });


// app.use("/user",userAuth,(err,req,res,next) => {
//     console.log("user is authorized")
//     res.send("User data fetched")
// });
