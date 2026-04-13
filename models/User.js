const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell us your name!"],
  },
  email: {
    type: String,
    required: [true, "Please provide your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"],
  },
  role: {
    type: String,
    enum: ["user", "worker", "admin"],
    default: "user",
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      // This only works on CREATE and SAVE!!!
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the same!",
    },
  },
  otpCode: String,
  otpExpires: Date,
  otpPurpose: {
    type: String,
    enum: ["signup", "reset"],
  },
  otpAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.methods.createOTP = function (purpose = "signup") {
  const otp = `${Math.floor(100000 + Math.random() * 900000)}`;

  this.otpCode = crypto.createHash("sha256").update(otp).digest("hex");
  this.otpExpires = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes
  this.otpPurpose = purpose;
  this.otpAttempts = 0;

  return otp;
};

userSchema.methods.correctOTP = function (candidateOTP) {
  const hashedCandidate = crypto
    .createHash("sha256")
    .update(candidateOTP)
    .digest("hex");
  return this.otpCode === hashedCandidate;
};

userSchema.methods.clearOTP = function () {
  this.otpCode = undefined;
  this.otpExpires = undefined;
  this.otpPurpose = undefined;
  this.otpAttempts = 0;
};

userSchema.pre("save", async function () {
  // Only hash password if it was modified
  if (!this.isModified("password")) return;

  // Hash the password
  this.password = await bcrypt.hash(this.password, 12);

  // Remove passwordConfirm
  this.passwordConfirm = undefined;
});

userSchema.pre("save", function () {
  if (!this.isModified("password") || this.isNew) return;

  this.passwordChangedAt = Date.now() - 1000;
});

userSchema.pre(/^find/, function () {
  // this points to the current query
  this.find({ active: { $ne: false } });
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
