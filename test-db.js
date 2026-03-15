const mongoose = require("mongoose");
require("dotenv").config();

const testConnection = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connected successfully!");
    await mongoose.connection.close();
    console.log("Connection closed.");
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
};

testConnection();