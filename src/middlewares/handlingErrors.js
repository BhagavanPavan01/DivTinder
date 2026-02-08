const express = require("express");
const app = express();
app.use("/user",(req,res,next)=>{
    throw new error("This is an error....!");
    // res.send("user is valid");
});

app.use("/",(err,req,res)=>{
    if(err){
        res.status(500).send("This is an error...!");
    }
});

app.listen(3000,()=>{
    console.log("The server is running secussfully*");
});