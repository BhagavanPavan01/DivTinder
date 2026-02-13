const express = require("express");
const userRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const  ConnectionRequest  = require("../models/connectionRequest");
const User = require("../models/user");

const USER_SAFE_DATA = "firstName lastName photoUrl age gender about skills";



// Get all pending connect requests for the loggedIn user
userRouter.get("/user/requests/received", userAuth, async(req,res) => {
    try{
        const loggedInUser = req.user;

        const connectionRequests = await ConnectionRequest.find({
            toUserId : loggedInUser._id,
            status: "interested",
        }).populate("fromUserId", USER_SAFE_DATA);

        res.json({message: "Data fetched successfully", data: connectionRequests,});

    }
    catch(err){
        res.status(400).send("ERROR :", + err.message);
    }

});


// User can Get All connection in our Database

userRouter.get("/user/connections", userAuth, async(req,res)=>{
    try{
        const loggedInUser = req.user;
        const connectionRequests = await ConnectionRequest.find({
            $or: [
                {toUserId: loggedInUser._id, status: "accepted"},
                {fromUserId: loggedInUser._id, status: "accepted"},
            ],
        }).populate("fromUserId", USER_SAFE_DATA).populate("toUserId", USER_SAFE_DATA);

        const data = connectionRequests.map((row) => {
            if (row.fromUserId._id.toString() === loggedInUser._id.toString()){
                return row.toUserId;
            }
            return row.fromUserId
        });

        res.json({data});
    }
    catch (err) {
        res.status(400).send("ERROR : " + err.message);
    }
});


// User feed for all users excepted loggedInUser and connections for all (accepted and interested) users

userRouter.get("/feed", userAuth, async(req,res) => {
    try{
        const loggedInUser = req.user;

        // Add the limit of users can show in the feed at a time in group
        const page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        limit = limit > 50 ? 50 : limit;

        const skip = (page - 1) * limit;

        const connectionRequests = await ConnectionRequest.find({
            $or: [{ fromUserId: loggedInUser._id }, { toUserId: loggedInUser._id }],
        }).select("fromUserId toUserId");

        const hideUserFromFeed = new Set();
        connectionRequests.forEach((req) => {
            hideUserFromFeed.add(req.fromUserId.toString());
            hideUserFromFeed.add(req.toUserId.toString());
        });

        const users = await User.find({
            $and: [
                { _id: {$nin: Array.from(hideUserFromFeed)}},
                { _id: { $ne: loggedInUser._id}},
            ],
        }).select(USER_SAFE_DATA).skip(skip).limit(limit);

        res.send(users);
    }
    catch(err){
        res.status(400).send("ERROR : " + err.message);
    }
});



module.exports = userRouter;