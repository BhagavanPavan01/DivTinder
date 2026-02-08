const express = require("express");

const app = express();

// ====== Written notes

// 1️⃣ Each /user handler functions as Express middleware, meaning it processes the request and can pass control onward.
// 2️⃣ Calling next() in each handler tells Express to move to the next matching middleware, allowing multiple handlers to run in sequence.
// 3️⃣ If next() is not called, the middleware chain stops immediately, and later handlers for the same route will not execute.


app.get("/user",(req,res,next) => {
    console.log("This is my Handler 1!!")
    // res.send("handeler 1 is executed.");
    next();
});

app.get("/user",(req,res,next) => {
    console.log("This is my Handler 2!!")
    // res.send("handeler 2 is executed.");
    next();
});

app.get("/user",(req,res,next) => {
    console.log("This is my Handler 3!!")
    // res.send("handeler 3 is executed.");
    next();
});

app.listen(3000,() => {
    console.log("The server started secussfully!....");
});

app.listen(3000,() => {
console.log("The server started secussfully!....");});