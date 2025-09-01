// crypto is a core module of node we don't need to install
const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'User must have a password'],
    minlength: 8,
    select: false, // Hide this field from the response
  },
  passwordConfirm: {
    type: String,
    required: [true, 'User must have a password'],
    validate: {
      // THIS WORKS ONLY ON CREATE AND SAVE
      validator(el) {
        return el === this.password;
      },
      message: 'Passwords are not the same',
    },
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

userSchema.pre('save', async function (next) {
  // ONLY RUN THIS FUNCTION IF PASSWORD WAS ACTUALLY MODIFIED
  if (!this.isModified('password')) return next();
  // HASH THE PASSWORD WITH COST OF 12
  this.password = await bcrypt.hash(this.password, 12);
  // DELETE PASSWORD CONFIRM FIELD
  this.passwordConfirm = undefined;
  next();
});
// we use pre save hook instead of pre update hook because findByIdAndUpdate() and other update methods are not document middleware, they are query middleware, and in query middleware 'this' points to the current query, not the document being updated
// this middleware runs before the document is saved to the database
userSchema.pre('save', function (next) {
  // if password is not modified or the document is new, we don't need to update the passwordChangedAt field
  if (!this.isModified('password') || this.isNew) {
    return next();
  }
  this.passwordChangedAt = Date.now() - 1000; // sometimes saving to DB is slower than issuing JWT, so we set the time a bit in the past
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Changed password after token was issued
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
  // create a new, temporary password for the user using node's crypto module
  // This creates a 72 characters long, cryptographically strong (very random) password using hexadecimal encoding (numbers 0-9, letters A-F)
  const resetToken = crypto.randomBytes(32).toString('hex');
  // We create hashed version of this password using crypto module's createHash function, since we never want to store plain text passwords in the database
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  // We've chosen "sha256" hashing function, which is a very fast operation (as opposed to bcrypt's slow hashing function), which is why we don't have to do this operation asynchronously, as it takes less than a millisecond to complete. The downside to this is that possible attackers can compare our hash to a list of commonly used passwords a lot more times in a given time frame then if using bcrypt, which is a slow operation. So you can do millions of password checks in the same amount of time that it takes to make 1 check using bcrypt. However, this is not a problem here as:
  // a) we used a very long and very random password (as opposed to user generated passwords, which usually have meaning and are far from random) and
  // b) our password is only valid for 10 minutes, so there is literally zero chance for the attacker to guess the password in that short amount of time.

  console.log({ resetToken }, this.passwordResetToken);

  // Token valid for 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
