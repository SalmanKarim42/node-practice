const expect = require("chai").expect;
const sinon = require("sinon");
const mongoose = require("mongoose");
const User = require("../models/user");
const AuthController = require("../controllers/auth");
describe("Auth Controller - Login", function () {
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
  it("should throw and error with code 500 if accessing the database fials.", function (done) {
    sinon.stub(User, "findOne");
    User.findOne.throws();

    const req = {
      body: {
        email: "test@test.com",
        password: "tester",
      },
    };

    AuthController.login(req, {}, () => {}).then((result) => {
      expect(result).to.be.an("error");
      expect(result).to.have.property("statusCode", 500);
      done(); // for async code testing
    });
    User.findOne.restore();
  });

  it("should send a response with a valid user status for and existing user", function (done) {
    const req = { userId: "5ed66e0888d099355299c165" };
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

    AuthController.getUserStatus(req, res, () => {}).then(() => {
      expect(res.statusCode).to.be.equal(200);
      expect(res.userStatus).to.be.equal("I am new!");
      done();
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
