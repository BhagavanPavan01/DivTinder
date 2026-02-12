const express = require("express");
const connectDB = require("./config/database");
const app = express();
const cookieParser = require("cookie-parser");
require("dotenv").config();


app.use(express.json());
app.use(cookieParser());

// ========= Managing the Router Or Importing the Routers

const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const requestRouter = require("./routes/request");
const userRouter = require("./routes/user");


// =========  Using these ROutes

app.use("/",authRouter);
app.use("/",profileRouter);
app.use("/",requestRouter);
app.use("/",userRouter);

//========== Database Connection to the server

connectDB().then(() => {
  console.log("Database connection is established...");
  app.listen(3000, () => {
    console.log("The server started successfully!....");
  });
}).catch((err) => {
  console.error("Database cannot be connected!!");
});





