const express = require("express");

const app = express();

// =============== Dynamic Routing "URL = http://localhost:3000/user/06/pavan/Keerthi@999"

app.get("/user/:userId/:name/:password",(req,res) => {
    console.log(req.params);
    res.send({firstName: "Bhagavan", lastName: "Pavan"});
});

// =============== Query Routing "URL = http://localhost:3000/user/06/pavan/Keerthi@999"

app.get("/user",(req,res) => {
    console.log(req.query);
    res.send({firstName: "Bhagavan", lastName: "Pavan"});
});

// ===========  based on firststring matching ("url = http://localhost:3000/.*fdskhfkjlyslkhfkah$hhhh")

app.get("/.*fly$",(req,res) => {
    res.send("Welcom Bhagavan Pavan from get web")
});

app.post("/web",(req,res) => {
    res.send("Web posted secussfully")
});

app.delete("/web",(req,res) => {
    res.send("Web delete Secussfully")
});

app.use("/web",(req,res) => {
    res.send("Welcom Bhagavan Pavan")
});

app.use("/home",(req,res) => {
    res.send("THis is my Home Page new.")
});

app.use("/hello",(req,res) => {
    res.send("Hello my Dear friend.");
});

app.use("/pavan",(req,res) => {
    res.send("This is Pavan Server.");
});

app.listen(3000,() => {
    console.log("The server started secussfully!....");
});



app.listen(3000,() => {
console.log("The server started secussfully!....");});
