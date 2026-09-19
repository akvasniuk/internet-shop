const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { sendJson } = require("../helpers/response");
const orderValidator = require("../validators/order.validator");
const idValidator = require("../validators/id.validator");

async function createOrder(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const parts = req.url.split("/");

      if (parts[1] === "orders" && parts[2]) {
        const userId = parts[2];

        const { error } = await idValidator.validate(userId);

        if (error) {
          return sendJson(res, 400, { message: "User id is not valid" });
        }

        const parsedBody = JSON.parse(body || "{}");
        const { error: orderError } = await orderValidator.validate(parsedBody);

        if (orderError) {
          return sendJson(res, 400, { message: orderError.details[0].message });
        }

        const { user } = req;

        const userById = await User.findById(userId);

        if (!userById) {
          return sendJson(res, 400, { message: `No user with id ${userId}` });
        }

        if (!userById._id.equals(user._id)) {
          return sendJson(res, 401, { message: "Wrong token or user id" });
        }

        const {
          firstname,
          lastname,
          phone,
          email,
          city,
          deliveryService,
          address,
          paymentMethod,
          items,
        } = parsedBody;

        const productIds = Object.keys(items);
        if (!productIds.length) {
          return sendJson(res, 400, { message: "Cart is empty" });
        }

        const dbProducts = await Product.find({ _id: { $in: productIds } });
        if (!dbProducts.length) {
          return sendJson(res, 400, { message: "No such products" });
        }

        for (const item of dbProducts) {
          const requestedQty = Number(items[item._id.toString()]);
          const currentStock = Number(item.stock);

          if (currentStock < requestedQty) {
            return sendJson(res, 400, {
              message: `Not enough stock for "${item.title}". Available: ${currentStock}, requested: ${requestedQty}`,
            });
          }
        }

        let totalAmount = 0;
        const bulkOperations = [];

        const orderItems = dbProducts.map((item) => {
          const qty = Number(items[item._id.toString()]);
          const itemSum = item.price * qty;
          totalAmount += itemSum;

          const newStockNumber = Math.max(0, Number(item.stock) - qty);

          let newStatus = "In Stock";
          if (newStockNumber === 0) {
            newStatus = "Out of Stock";
          } else if (newStockNumber < 5) {
            newStatus = "Low Stock";
          }

          bulkOperations.push({
            updateOne: {
              filter: { _id: item._id },
              update: {
                $set: {
                  stock: String(newStockNumber),
                  availabilityStatus: newStatus,
                },
              },
            },
          });

          return {
            product: item._id,
            title: item.title,
            price: item.price,
            quantity: qty,
            image: item.image,
          };
        });

        const newOrder = await Order.create({
          user: user._id,
          items: orderItems,
          shippingAddress: {
            firstname,
            lastname,
            phone,
            email,
            city,
            deliveryService,
            address,
          },
          paymentMethod,
          totalAmount,
        });

        if (bulkOperations.length > 0) {
          await Product.bulkWrite(bulkOperations);
        }

        return sendJson(res, 201, {
          success: true,
          message: "Order placed successfully",
          orderId: newOrder._id,
        });
      }
    } catch (error) {
      return sendJson(res, 500, { message: error.message });
    }
  });
}

async function getOrders(req, res) {
  try {
    const parts = req.url.split("/");

    if (parts[1] === "orders" && parts[2]) {
      const userId = parts[2];

      const { error } = await idValidator.validate(userId);

      if (error) {
        return sendJson(res, 400, { message: "User id is not valid" });
      }

      const { user } = req;

      const userById = await User.findById(userId);

      if (!userById) {
        return sendJson(res, 400, { message: `No user with id ${userId}` });
      }

      if (!userById._id.equals(user._id)) {
        return sendJson(res, 401, { message: "Wrong token or user id" });
      }

      const orders = await Order.find({ user: user._id })
        .sort({ createdAt: -1 })
        .lean();

      return sendJson(res, 200, {
        success: true,
        orders: orders,
      });
    }
  } catch (error) {
    return sendJson(res, 500, { message: error.message });
  }
}

module.exports = {
  createOrder,
  getOrders,
};
