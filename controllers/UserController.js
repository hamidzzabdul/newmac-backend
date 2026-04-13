const User = require("./../models/User");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/AppError");
const factory = require("./handlerFactory");

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400,
      ),
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, "name", "email");
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not defined! Please use /signup instead",
  });
};

exports.updateUserRole = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!["user", "worker", "admin"].includes(role)) {
    return next(new AppError("Invalid role selected", 400));
  }

  const user = await User.findById(id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Optional safety: prevent admin from demoting themselves accidentally
  if (req.user.id === id && role !== "admin") {
    return next(new AppError("You cannot remove your own admin role", 400));
  }

  user.role = role;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: "User role updated successfully",
    data: {
      user,
    },
  });
});

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
