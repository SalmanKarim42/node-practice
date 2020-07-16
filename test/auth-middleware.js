const authMiddleware = require("../middleware/is-auth");
const jwt = require("jsonwebtoken");
const expect = require("chai").expect;
const sinon = require("sinon");

describe("Auth middleware", function () {
  it("Should thorw an error if no authorization header is present", function () {
    const req = {
      get: function (headerName) {
        return null;
      },
    };
    expect(authMiddleware.bind(this, req, {}, () => {})).to.throw(
      "Not Authenticated."
    );
  });

  it("Should thorw an error if we authorization header is only one string", function () {
    const req = {
      get: function (headerName) {
        return "xyz";
      },
    };
    expect(authMiddleware.bind(this, req, {}, () => {})).to.throw();
  });
  it("Should yield a userId aftere decoding the token", function () {
    const req = {
      get: function (headerName) {
        return "Bearer kjsdlkfjksjfldsjlkfasdfdsfdfsaakds";
      },
    };
    sinon.stub(jwt, "verify");
    jwt.verify.returns({ userId: "abc" });
    authMiddleware(req, {}, () => {});
    expect(req).to.have.property("userId");
    expect(req).to.have.property('userId','abc')
    expect(jwt.verify.called).to.be.true
    jwt.verify.restore();
  });
  it("Should thorw an error if token not verify", function () {
    const req = {
      get: function (headerName) {
        return "Bearer xyz";
      },
    };
    expect(authMiddleware.bind(this, req, {}, () => {})).to.throw();
  });
});
