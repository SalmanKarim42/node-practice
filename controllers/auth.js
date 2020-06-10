const User = require("../models/user");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.signup = async (req, res, next) => {
  const { email, name, password } = req.body;
  const errors = validationResult(req);
  //   console.log(errors);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed.");
    error.statusCode = 422;
    throw error;
  }
  try {
    const hashPassword = await bcrypt.hash(password, 12);

    const user = new User({
      email,
      name,
      password: hashPassword,
    });
    const result = await user.save();

    res.status(201).json({
      message: "User created!",
      userId: result._id,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const loadedUser = await User.findOne({ email });
    if (!loadedUser) {
      const error = new Error("A user with this email could not be found ");
      error.statusCode = 401;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, loadedUser.password);

    if (!isEqual) {
      const error = new Error("Wrong password");
      error.statusCode = 401;
      throw error;
    }
    const token = jwt.sign(
      {
        email: loadedUser.email,
        userId: loadedUser._id.toString(),
      },
      "somesupersecret",
      { expiresIn: "1h" }
    );
    res.status(200).json({
      token,
      userId: loadedUser._id.toString(),
    });
    return;
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
    return err;
  }
};

exports.getUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ status: user.status });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
};
