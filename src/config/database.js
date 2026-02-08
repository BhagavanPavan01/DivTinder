const mongoose = require("mongoose");

const connectDB = async () => {
    await mongoose.connect("mongodb+srv://bhagavanpavan999_db_pavandevtinder:L3x1E4vqHExzfyeP@pavandevtinder.chdsfff.mongodb.net/?appName=PavanDevTinder");
};

module.exports = connectDB;
