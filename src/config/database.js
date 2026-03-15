const mongoose = require("mongoose");

const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
    });
};

module.exports = connectDB;

