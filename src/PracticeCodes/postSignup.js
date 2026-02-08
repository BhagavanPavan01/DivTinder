const express = require("express");
const connectDB = require("../config/database");
const app = express();
const User = require("../models/user");
app.use(express.json())


//======= User access to our Database

app.post("/Signup", async (req,res) => {
    const user = new User (req.body);
    
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





