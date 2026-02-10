const mongoose = require("mongoose");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");


const userSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        index: true,
    },
    lastName: {
        type: String
    },
    emailId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error("Invalid email adress: " + value)
            }
        }
    },
    password: {
        type: String,
        required: true,
    },
    age: {
        type: Number,
        min: 18
    },
    gender: {
        type: String,
        validate(value) {
            if (!["male", "female", "others"].includes(value)) {
                res.send("Please Enter the Gender...!")
            }
        },
    },
    photoUrl: {
        type: String,
        // default: "https://www.clipartmax.com/png/full/231-2318072_if-you-are-self-employed-passport-size-photo-cartoon.png",
        validate(value) {
            if (!validator.isURL(value)) {
                throw new Error("Enter Valid Photo URL...!" + value)
            }
        }
    },
    phoneNumber: {
        type: Number,
        min: 10,
        max: 10
    },
    skills: {
        type: [String],
        validate(value) {
            if (value.length > 10) {
                throw new Error("Skills cannot be more than 10")
            }
        },
    },
    about: {
        type: String,
        default: "This is a default about of the user."
    }

},
    {
        timestamps: true,
    }
);

// Creating index for searching the data in DB speed

userSchema.index({firstName : 1, lastName : 1});
userSchema.index({gender : 1});

// Creating the own user JWT token 

userSchema.methods.getJWT = async function () {
    const user = this;
    const token = await jwt.sign({ _id: user._id }, "PavanDiveTinder@token$420", {expiresIn: "7d"});
    return token;
}

// checking the User hash Password using using bcrypt function

userSchema.methods.validatePassword = async function (passwordInputByUser) {
    const user = this;
    const passwordHash = user.password;

    const isPasswordValid= await bcrypt.compare(passwordInputByUser,passwordHash);
    return isPasswordValid;
    
}

const user = mongoose.model("User", userSchema);
module.exports = user;