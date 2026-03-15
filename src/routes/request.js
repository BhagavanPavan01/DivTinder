const express =  require("express");
const requestRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const User = require("../models/user");


// =============== Send Connection request Api using JWT Token Authentication

requestRouter.post("/request/send/:status/:toUserId", userAuth , async (req,res) => {

  try{
    const fromUserId = req.user._id;
    const toUserId = req.params.toUserId;
    const status = req.params.status;

    const allowedStatus = ["ignored", "interested"];
    if(!allowedStatus.includes(status)){
      return res.status(400).json({message: "Invalid status type : " + status});
    }

    const toUser = await User.findById(toUserId);
    if (!toUser) {
      return res.status(404).json({message: "Sending the wrong User"})
    }

    const existingConnectionRequest = await ConnectionRequest.findOne({
      $or: [
        {fromUserId, toUserId},
        {fromUserId: toUserId, toUserId: fromUserId},
      ],
    });

    if (existingConnectionRequest) {
      return res.status(400).send({message: "Connection Already Exists!"});
    }

    const connectionRequest = new ConnectionRequest({
      fromUserId,
      toUserId,
      status,
    });

    const data = await connectionRequest.save();

    res.json({
      message: req.user.lastName + " is " + status + " in " +toUser.lastName,
      data,
    })

  }  catch (err) {
    res.status(400).send("Error :" + err.message);
  }
});



// ============= GET PENDING REQUESTS =============
requestRouter.get("/request/pending", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    
    const pendingRequests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested"
    })
    .populate("fromUserId", "firstName lastName emailId photoUrl age gender skills about phoneNumber")
    .sort({ createdAt: -1 });

    const formattedRequests = pendingRequests
      .filter(request => request.fromUserId) // Filter out requests where user was deleted
      .map(request => ({
        _id: request._id,
        status: request.status,
        createdAt: request.createdAt,
        requester: {
          _id: request.fromUserId._id,
          name: `${request.fromUserId.firstName} ${request.fromUserId.lastName || ''}`.trim(),
          firstName: request.fromUserId.firstName,
          lastName: request.fromUserId.lastName,
          email: request.fromUserId.emailId,
          photoUrl: request.fromUserId.photoUrl,
          age: request.fromUserId.age,
          gender: request.fromUserId.gender,
          skills: request.fromUserId.skills || [],
          about: request.fromUserId.about,
          phoneNumber: request.fromUserId.phoneNumber
        }
      }));

    res.status(200).json({
      success: true,
      count: formattedRequests.length,
      data: formattedRequests
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});



// ============= GET PENDING REQUESTS COUNT =============
requestRouter.get("/request/pending/count", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    
    const count = await ConnectionRequest.countDocuments({
      toUserId: loggedInUser._id,
      status: "interested"
    });

    res.status(200).json({
      success: true,
      count
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});


// =============== after Send Connection request user can accepted or rejected (API)

requestRouter.post("/request/review/:status/:requestId", userAuth, async (req,res) =>{
  try{
    const loggedInUser = req.user;
    const{status, requestId} = req.params;

    const allowedStatus = ["accepted", "rejected"];
    if(!allowedStatus.includes(status)){
      return res.status(400).json({ message : "Status not allowed" });
    }

    const connectionRequest = await ConnectionRequest.findOne({
      _id: requestId,
      toUserId: loggedInUser._id,
      status: "interested",
    });

    if(!connectionRequest){
      return res.status(404).json({ message: "Connection request not found." });
    }

    connectionRequest.status = status;
    const data = await connectionRequest.save();
    res.json({ message: "COnnection request " + status, data });
  }
  catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
});



// ============= GET ALL CONNECTIONS =============
requestRouter.get("/connections", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    
    const connections = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUser._id, status: "accepted" },
        { toUserId: loggedInUser._id, status: "accepted" }
      ]
    })
    .populate("fromUserId", "firstName lastName emailId photoUrl age gender skills about")
    .populate("toUserId", "firstName lastName emailId photoUrl age gender skills about")
    .sort({ updatedAt: -1 });

    const formattedConnections = connections
      .filter(conn => conn.fromUserId && conn.toUserId) // Filter out connections where users were deleted
      .map(conn => {
        const otherUser = conn.fromUserId._id.toString() === loggedInUser._id.toString() 
          ? conn.toUserId 
          : conn.fromUserId;

        return {
          _id: conn._id,
          connectedSince: conn.updatedAt,
          user: {
            _id: otherUser._id,
            name: `${otherUser.firstName} ${otherUser.lastName || ''}`.trim(),
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            email: otherUser.emailId,
            photoUrl: otherUser.photoUrl,
            age: otherUser.age,
            gender: otherUser.gender,
            skills: otherUser.skills || [],
            about: otherUser.about
          }
        };
      });

    res.status(200).json({
      success: true,
      count: formattedConnections.length,
      data: formattedConnections
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

// ============= GET SENT REQUESTS =============
requestRouter.get("/request/sent", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    
    const sentRequests = await ConnectionRequest.find({
      fromUserId: loggedInUser._id,
      status: "interested"
    })
    .populate("toUserId", "firstName lastName emailId photoUrl age gender skills about")
    .sort({ createdAt: -1 });

    const formattedRequests = sentRequests
      .filter(request => request.toUserId) // Filter out requests where user was deleted
      .map(request => ({
        _id: request._id,
        status: request.status,
        createdAt: request.createdAt,
        recipient: {
          _id: request.toUserId._id,
          name: `${request.toUserId.firstName} ${request.toUserId.lastName || ''}`.trim(),
          firstName: request.toUserId.firstName,
          lastName: request.toUserId.lastName,
          email: request.toUserId.emailId,
          photoUrl: request.toUserId.photoUrl,
          age: request.toUserId.age,
          gender: request.toUserId.gender,
          skills: request.toUserId.skills || [],
          about: request.toUserId.about
        }
      }));

    res.status(200).json({
      success: true,
      count: formattedRequests.length,
      data: formattedRequests
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});


module.exports = requestRouter;

