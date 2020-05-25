const path = require("path");

const express = require("express");
const isAuth = require("../middleware/is-auth");

const shopController = require("../controllers/shop");

const router = express.Router();

router.get("/", shopController.getIndex);

router.get("/products", shopController.getProducts);

router.get("/products/:id", shopController.getProductByID);

router.get("/cart", isAuth, shopController.getCart);

router.post("/add-to-cart", isAuth, shopController.postCart);

router.post("/cart-delete-item", isAuth, shopController.postCartDelete);

router.get("/checkout", isAuth, shopController.getCheckout);
// router.get('/secret', isAuth, shopController.getSecret);

router.get("/orders", isAuth, shopController.getOrders);

router.get('/orders/:orderId',isAuth,shopController.getInvoice)
module.exports = router;
