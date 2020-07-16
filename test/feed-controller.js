const expect = require("chai").expect;
const sinon = require("sinon");
const mongoose = require("mongoose");
const User = require("../models/user");
const Post = require("../models/post");
const FeedController = require("../controllers/feed");
describe("Feed Controller - Create Post", function () {
  before(function (done) {
    mongoose
      .connect(
        "mongodb+srv://salman:Demo1234@cluster0-hfefl.mongodb.net/test-messages?authSource=admin&replicaSet=Cluster0-shard-0&w=majority&readPreference=primary&appname=MongoDB%20Compass&retryWrites=true&ssl=true",
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }
      )
      .then((result) => {
        const user = new User({
          email: "test4@test.com",
          password: "tester",
          name: "test ",
          posts: [],
          _id: "5ed66e0888d099355299c165",
        });
        return user.save();
      })
      .then(() => {
        done();
      });
  });
  it("should add a created post to the posts of the creator", function (done) {
    const req = {
      userId: "5ed66e0888d099355299c165",
      body: {
        title: "test post",
        content: "A test Post",
      },
      file: {
        path: "abc",
      },
    };
    const res = {
      statusCode: 500,
      userStatus: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.userStatus = data.status;
      },
    };

    FeedController.createPost(req, res, () => {}).then((savedUser) => {
      expect(savedUser).to.have.property("posts");
      expect(savedUser.posts).to.have.length(1);
      done(); // for async code testing
    });
  });

  after(function (done) {
    User.deleteMany({})
      .then(() => {
        return mongoose.disconnect();
      })
      .then(() => {
        done();
      });
  });
});
