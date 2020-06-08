const Product = require("../models/product");
const Order = require("../models/order");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const stripe = require("stripe")(process.env.STRIPE_KEY);

const ITEMS_PER_PAGE = 1;

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;
  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((prods) => {
      res.render("shop/product-list", {
        prods,
        pageTitle: "Products",
        path: "/products",
        currentPage: page,
        totalProducts: totalItems,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
exports.getProductByID = (req, res, next) => {
  let { id } = req.params;
  Product.findById(id)
    .then((product) => {
      // console.log(product[0]);
      res.render("shop/product-detail", {
        product,
        pageTitle: "Product",
        path: "/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;
  Product.find()
    .countDocuments()
    .then((numProducts) => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((prods) => {
      res.render("shop/index", {
        prods,
        pageTitle: "Shop",
        path: "/",
        currentPage: page,
        totalProducts: totalItems,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      // console.log(user.cart.items);
      const products = user.cart.items;
      res.render("shop/cart", {
        products: products,
        pageTitle: "Your Cart",
        path: "/cart",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
exports.postCartDelete = (req, res, next) => {
  const { prodId } = req.body;

  req.user
    .deleteItemFromCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      // console.log(orders);
      res.render("shop/orders", {
        orders,
        pageTitle: "Your Orders",
        path: "/orders",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then(async (user) => {
      const products = user.cart.items;
      let total = 0;
      products.forEach((p) => (total += p.quantity * p.productId.price));
      console.log(total, "total", products);

      return res.render("shop/checkout", {
        products: products,
        pageTitle: "Checkout",
        path: "/checkout",
        totalSum: total,
      });
    })
    .catch((err) => {
      console.log();
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  let total = 0;
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, productData: { ...i.productId._doc } };
      });
      products.forEach((p) => (total += p.quantity * p.productData.price));

      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products,
      });
      return order.save();
    })
    .then((result) => {
      const token = req.body.stripeToken;
      const charge = stripe.charges.create({
        amount: total * 100,
        currency: "usd",
        description: "Example ",
        source: token,
        metadata: {
          order_id: result._id.toString(),
        },
      });
      console.log('charge',charge)
      return req.user.clearCart();
    })
    .then((result) => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const { orderId } = req.params;
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("No order found."));
      }
      console.log(order.products);
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unauthorized"));
      }
      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);

      res.setHeader(
        "Content-Disposition",
        'attachment; filename="' + invoiceName + '"'
      );
      const pdfDoc = new PDFDocument();
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);
      pdfDoc.fontSize(26).text("Invoice", {
        underline: true,
      });
      pdfDoc.text("---------------------------");
      let totalPrice = 0;
      order.products.forEach((prod) => {
        totalPrice += prod.quantity * prod.productData.price;
        pdfDoc
          .fontSize(14)
          .text(
            prod.productData.title +
              " - " +
              prod.quantity +
              " x " +
              "$" +
              prod.productData.price
          );
      });
      pdfDoc.fontSize(26).text("---------------------------");
      pdfDoc.fontSize(20).text("Total Price: $" + totalPrice);
      pdfDoc.end();

      // // for small files

      // fs.readFile(invoicePath, (err, data) => {
      //   if (err) {
      //     return next(err);
      //   }
      //   res.setHeader("Content-Type", "application/pdf");
      //   res.setHeader(
      //     "Content-Disposition",
      //     'attachment; filename="' + invoiceName + '"'
      //   );
      //   return res.send(data);
      // });

      // // for large files sending in chunks
      // const file = fs.createReadStream(invoicePath);
      // res.setHeader("Content-Type", "application/pdf");
      // res.setHeader(
      //   "Content-Disposition",
      //   'attachment; filename="' + invoiceName + '"'
      // );
      // file.pipe(res);
    })
    .catch((err) => next(err));
};

// exports.getSecret = async (req, res, next) => {
//   const intent = res.json({ client_secret: intent.client_secret }); // ... Fetch or create the PaymentIntent
// };
