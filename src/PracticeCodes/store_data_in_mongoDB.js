const express = require("express");
const connectDB = require("../config/database");
const app = express();
const User = require("../models/user");
app.use(express.json());  // Middle ware funcion

// const { adminAuth, userAuth } = require("./middlewares/auth");

// app.use("/admin",adminAuth,(req,res,next) => {
//     console.log("Admin is authorized")
//     res.send("All data fetched")
// });

// app.use("/user",userAuth,(err,req,res,next) => {
//     console.log("user is authorized")
//     res.send("User data fetched")
// });

//======= User access to our Database

app.post("/Signup", async (req,res) => {
    const user = new User ({
        firstName : "Bhagavan",
        lastName : "Appanna",
        emailId : "bhagavanappanna@gmai.com",
        password : "Appanna@1234",
    });
    
try{
await user.save();
    res.send("user added successfullly..!");
} catch (err) {
    res.status(400).send("Error to adding the user :"+ err.message);
}
});

// Database Connection to the server

connectDB().then(() => {
    console.log("Database connection is established...");
    app.listen(3000,() => {
    console.log("The server started secussfully!....");
});
}).catch((err) =>{
    console.error("Database cannot be connected!!");
});





