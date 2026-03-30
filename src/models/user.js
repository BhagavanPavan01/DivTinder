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
        enum: ["male", "female", "others"],
        required: true
    },
    photoUrl: {
        type: String,
        validate(value) {
            if (value && !validator.isURL(value)) {
                throw new Error("Enter Valid Photo URL!");
            }
        }
    },
    phoneNumber: {
        type: String,
        validate(value) {
            if (value && value.length !== 10) {
                throw new Error("Phone number must be 10 digits");
            }
        }
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
    },// Add to your userSchema
    isOnline: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    }

},
    {
        timestamps: true,
    }
);

// Creating index for searching the data in DB speed

userSchema.index({ firstName: 1, lastName: 1 });
userSchema.index({ gender: 1 });

// Creating the own user JWT token 

userSchema.methods.getJWT = async function () {
    const user = this;
    const token = await jwt.sign({ _id: user._id }, "PavanDiveTinder@token$420", { expiresIn: "7d" });
    return token;
}

// checking the User hash Password using using bcrypt function

userSchema.methods.validatePassword = async function (passwordInputByUser) {
    const user = this;
    const passwordHash = user.password;

    const isPasswordValid = await bcrypt.compare(passwordInputByUser, passwordHash);
    return isPasswordValid;

}

const user = mongoose.model("User", userSchema);
module.exports = user;