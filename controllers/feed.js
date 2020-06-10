const fs = require("fs");
const path = require("path");

const { validationResult } = require("express-validator");

const io = require("../socket");
const Post = require("../models/post");
const User = require("../models/user");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;

  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator", "name ")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: "Fetched posts successfully. ",
      posts,
      totalItems,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
exports.createPost = async (req, res, next) => {
  const { title, content } = req.body;
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }
  if (!req.file) {
    const error = new Error("No image provided");
    error.statusCode = 422;
    throw error;
  }
  let imageUrl = req.file.path;
  imageUrl = imageUrl.replace("\\", "/");
  // console.log(imageUrl);

  try {
    const post = new Post({
      title,
      content,
      imageUrl,
      creator: req.userId,
    });
    await post.save();
    const creator = await User.findById(req.userId);
    creator.posts.push(post);
    const savedUser = await creator.save();
    // io.getIO().emit("posts", {
    //   action: "create",
    //   post: { ...post._doc, creator: { _id: creator._id, name: creator.name } },
    // });
    res.status(201).json({
      message: "Post created Successfully ",
      post: { ...post._doc, creator: { _id: creator._id, name: creator.name } },
      creator: { _id: creator._id, name: creator.name },
    });
    return savedUser;
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
    return err;
  }
};

exports.getPost = async (req, res, next) => {
  const { postId } = req.params;
  try {
    const post = await Post.findById(postId).populate("creator", "name ");

    if (!post) {
      const error = new Error("Could not find post");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      message: "Post fetched.",
      post,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const { title, content, image } = req.body;
  let imageUrl = image;
  const { postId } = req.params;

  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed, entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }
  if (req.file) {
    imageUrl = req.file.path;
    imageUrl = imageUrl.replace("\\", "/");
  }
  if (!imageUrl) {
    const error = new Error("No file picked.");
    error.statusCode = 422;
    throw error;
  }
  // console.log(imageUrl);
  try {
    const post = await Post.findById(postId).populate("creator", "name ");
    if (!post) {
      const error = new Error("Could not find post");
      error.statusCode = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error("Not Authorized");
      error.statusCode = 403;
      throw error;
    }
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }
    post.imageUrl = imageUrl;
    post.title = title;
    post.content = content;
    let result = await post.save();
    console.log(result);
    io.getIO().emit("posts", {
      action: "update",
      post: result,
    });
    res.status(200).json({
      message: "Post Updated Successfully ",
      post: result,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const { postId } = req.params;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error("Could not find post");
      error.statusCode = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error("Not Authorized");
      error.statusCode = 403;
      throw error;
    }
    clearImage(post.imageUrl);
    const result = await Post.findByIdAndRemove(postId);

    // console.log(result);
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();
    io.getIO().emit("posts", {
      action: "delete",
      post: postId,
    });
    res.status(200).json({ message: "Deleted post." });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => console.log(err));
};
