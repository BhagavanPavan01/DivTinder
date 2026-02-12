const mongoose = require("mongoose");

const connectionRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ["ignored", "interested", "accepted", "rejected"],
        message: `{VALUE} is incorrect status type`
      }
    }
  },
  {
    timestamps: true
  }
);

// To search the user connection details smooth and speed the "indexing" is very important

connectionRequestSchema.index({ fromUserId: 1, toUserId: 1});

// To check the Schema level validation if the user can send same user (send itself) it will handle safely using <<<<<"pre">>>>> throw an new error

connectionRequestSchema.pre("save", function (next) {
  const connectionRequest = this;
  if(connectionRequest.fromUserId.equals(connectionRequest.toUserId)){
    throw new Error ("Cannot send connection request to yourself!");
  }
});




const ConnectionRequestModel = mongoose.model(
  "ConnectionRequest",
  connectionRequestSchema
);

module.exports = ConnectionRequestModel;
