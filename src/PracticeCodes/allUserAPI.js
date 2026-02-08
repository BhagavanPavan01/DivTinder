
//==============Get user by emailId - using find method (req.body.firstName)

app.get("/user", async (req, res) => {
  try {
    const firstName = req.body.firstName?.trim(); // ✅ GET uses query params
    
    console.log("Email received:", firstName);
    
    const users = await User.find({ firstName }); // use findOne
    
    if (users.length == 0) {
      res.status(404).send("User not found");
    }
    
    if (!users) {
      return res.status(404).send("User not found");
    }
    
    res.json(users); // ✅ return result object...
  } catch (err) {
    res.status(500).send("Something went wrong!");
  }
});

//============Get All users from out Database

app.get("/feed", async (req, res) => {
  try {
    const users = await User.find({})
    res.json(users)
    
  } catch (err) {
    res.status(500).send("Something went wrong!");
  }
});

//========= Deleting the user in MongoDb useing user id - findByIdAndDelete() method

app.delete("/user", async (req, res) => {
  const userId = req.body.userId;
  try {
    const user = await User.findByIdAndDelete(userId);
    res.send("User deleted Successfully...!")
  } catch (err) {
    res.status(500).send("Something went wrong!");
  }
});

//========= Updata User data using (Id) - findByIdAndUpdate

app.patch("/user", async (req, res) => {
  const body = req.body || {};
  const userId = body._id;     // ✅ use _id
  const data = body;           // ✅ define data
  
  try {
    const ALLOWED_UPDATES = [
      "_id", "photoUrl", "about", "gender", "skills", "age",
    ];
    const isUpdateAllowed = Object.keys(data).every((k) => ALLOWED_UPDATES.includes(k));
    
    if (!isUpdateAllowed) {
      //res.status(400).send("Update not allowed");
      throw new Error("Update Not Allowed..!");
    };
    
    
    ////  -- This validation is Done by user Schema level
    // if (data.skills?.length > 10) {
    //   throw new Error("Skills cannot be more than 10");
    // }
    
    const user = await User.findByIdAndUpdate(
      userId,
      data,
      {
        new: true,
        runValidators: true,
      }
    );
    
    if (!user) {
      return res.status(404).send("User not found");
    }
    
    //console.log(user);   // Testing purpus only uncomment it
    res.send("User Updated Successfully");
    
  } catch (err) {
    res.status(500).send("UPDATE FAILED: " + err.message);
  }
});


//========= Updata User data using (emailId) - findByIdAndUpdate


app.patch("/email", async (req, res) => {
  const body = req.body || {};   // || {} - is empty object
  const emailId = body.emailId;   // ✅ use emailId
  const data = body;
  
  if (!emailId) {
    return res.status(400).send("emailId is required");
  }
  
  try {
    const user = await User.findOneAndUpdate(
      { emailId: emailId },   // ✅ filter by emailId
      data,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!user) {
      return res.status(404).send("User not found");
    }
    
    console.log(user);
    res.send("User Updated Successfully");
    
  } catch (err) {
    res.status(500).send("Something went wrong!");
  }
});


