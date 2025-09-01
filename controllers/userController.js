const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// allowedFields is a list of fields that are allowed to be updated.
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// this is for the getMe route to get the current logged in user data.
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined! Please use /signup instead',
  });
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updatePassword',
        400,
      ),
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  // we want to allow users to update only their name and email.
  // So we filter out unwanted fields that are not allowed to be updated.
  const filteredBody = filterObj(req.body, 'name', 'email');
  // 3) Update User document
  // new: true to return the modified document rather than the original.
  // runValidators: true to run schema validators on update operation.
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  // we are not actually deleting the user from the database, we are just setting the active field to false.
  // this way we can keep the user data in the database for future reference, but the user will not be able to login or access any protected routes.
  // we are using findByIdAndUpdate instead of findByIdAndDelete because we want to keep the user data in the database.
  // also we are not sending any response data back to the client, just a 204 No Content status.
  // req.user is coming from protect middleware.
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
// Do NOT update password with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
