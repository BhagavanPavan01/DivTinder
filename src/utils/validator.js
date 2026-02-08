const validator = require("validator");

const validateSignupData = (req) => {
    const {firstName,lastName,emailId,password} = req.body;

    if( !firstName || !lastName ){
        throw new Error("Name is not Valid");
    } else if(!validator.isEmail(emailId)) {
        throw new Error("Email is not valid")
    } else if (!validator.isStrongPassword(password)){
        throw new Error("Please enter the strong Password.")
    }
};


const validateEditProfileData = (req) =>{
    const allowedEditFields = ["firstName" ,"lastName","photoUrl","gender","age","skills", "about",];

    const isEditAllowed = Object.keys(req.body).every((field) => allowedEditFields.includes(field));
    
    return isEditAllowed;
};

module.exports = {
    validateSignupData,
    validateEditProfileData,
}