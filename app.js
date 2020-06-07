const express = require("express");
const path = require("path");

const bodyParser = require("body-parser");

const multer = require("multer"); // for file upload ;
const { clearImage } = require("./util/file");
const mongoose = require("mongoose");

const graphQLHttp = require("express-graphql");
const graphql_schema = require("./graphql/schema");
const graphql_resolver = require("./graphql/resolver");
const app = express();

const auth = require("./middleware/auth");
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

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
); // for file upl0ading
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(auth);

app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) {
    throw new Error("Not Authenticated");
  }
  if (!req.file) {
    return res.status(200).json({ message: "No file provided!" });
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }
  return res.status(201).json({
    message: "file stored",
    filePath: req.file.path.replace("\\", "/"),
  });
});

app.use(
  "/graphql",
  graphQLHttp({
    schema: graphql_schema,
    rootValue: graphql_resolver,
    graphiql: true, // for browser query running
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || "An Error occured";
      const status = err.originalError.code || 500;
      return {
        message,
        status,
        data,
      };
    },
  })
);

app.use((error, req, res, next) => {
  console.log(error);

  const status = error.statusCode;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message, data });
});

mongoose
  .connect(
    "mongodb+srv://salman:Demo1234@cluster0-hfefl.mongodb.net/messages?authSource=admin&replicaSet=Cluster0-shard-0&w=majority&readPreference=primary&appname=MongoDB%20Compass&retryWrites=true&ssl=true"
  )
  .then((result) => {
    app.listen(8080);
  })
  .catch((err) => {
    console.log("mongo:", err);
  });
