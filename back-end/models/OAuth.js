const mongoose = require("mongoose");

const oAuthScheme = new mongoose.Schema(
  {
    accessToken: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true },
);

oAuthScheme.pre("findOne", function () {
  this.populate("user");
});

module.exports = mongoose.model("OAuth", oAuthScheme);
