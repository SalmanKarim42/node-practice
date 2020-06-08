const path = require("path");
const fs = require("fs");
const https = require("https");
const express = require("express");
const bodyParser = require("body-parser");
const helmet = require("helmet"); // helmet for response header security :-)
const mongoose = require("mongoose");
const session = require("express-session");
const mongoDBStore = require("connect-mongodb-session")(session); // storing session to db
const app = express();
const csrf = require("csurf");
const flash = require("connect-flash");
require("dotenv").config();
const multer = require("multer");
const compression = require("compression"); // compression for compress assets files
const morgan = require("morgan"); // morgan for logging req
const MONGODBURI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-hfefl.mongodb.net/${process.env.MONOG_DB}?retryWrites=true&w=majority`;

// session collection setting in db
const store = new mongoDBStore({
  uri: MONGODBURI,
  collection: "sessions",
});
// session collection setting in db end

const csrfProtection = csrf();

// const privateKey = fs.readFileSync("server.key");
// const certificate = fs.readFileSync("server.cert");

app.set("view engine", "ejs");
app.set("views", "views");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
const errorController = require("./controllers/error");
const User = require("./models/user");

const isAuth = require("./middleware/is-auth");

const shopController = require("./controllers/shop");
// file path and name settings using multer middleware
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now() + "_" + file.originalname);
  },
});

// file filter using multer middleware
const fileFilter = (req, file, cb) => {
  // console.log(file);
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else cb(null, false);
};

// creating file for storing logs
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  {
    flags: "a", // append new data in the file flage
  }
);

app.use(helmet()); // helmet
app.use(compression()); // compression
// app.use(morgan("combined")); // morgan only show in console
app.use(
  morgan("combined", {
    stream: accessLogStream,
  })
); // morgan storing in custom log file accessLogStream
app.use(bodyParser.urlencoded({ extended: false })); // only for text data
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
); // for file upl0ading
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

// only using session
app.use(
  session({
    secret: "myAppSecret",
    resave: false,
    saveUninitialized: false,
    store,
  })
);
app.use(flash());
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  next();
});
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) return next();
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});

app.post("/create-order", isAuth, shopController.postOrder);

app.use(csrfProtection); // applying csrf protection  using package csurf
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});
app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get("/500", errorController.get500Page);
app.use(errorController.get404Page);

app.use((error, req, res, next) => {
  console.log(error, req.session);
  res.status(500).render("500", {
    pageTitle: "Error!",
    path: "/500",
    isAuthenticated: req.session.isLoggedIn,
  });
});

mongoose
  .connect(MONGODBURI)
  .then((result) => {
    // https
    //   .createServer(
    //     {
    //       key: privateKey,
    //       cert: certificate,
    //     },
    //     app
    //   )
    //   .listen(process.env.PORT || 3000);

    app.listen(process.env.PORT || 3000);
  })
  .catch((err) => {
    console.log("error", err);
  });
