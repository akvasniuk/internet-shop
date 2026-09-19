const Product = require("../models/Product");
const { sendJson } = require("../helpers/response");
const idValidator = require("../validators/id.validator");
const productValidator = require("../validators/product.validator");
const productReviewValidator = require("../validators/product.review.validator");
const formidable = require("formidable");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

async function getProducts(req, res) {
  try {
    const baseURL = "http://" + req.headers.host;
    const parsedURL = new URL(req.url, baseURL);

    const limit = parseInt(parsedURL.searchParams.get("limit")) || 10;
    const skip = parseInt(parsedURL.searchParams.get("skip")) || 0;
    const search = parsedURL.searchParams.get("search") || "";
    const sortParam = parsedURL.searchParams.get("sort") || "price-asc";

    let filter = {};
    let sortOptions = {};

    switch (sortParam) {
      case "price-asc":
        sortOptions = { price: 1 };
        break;
      case "price-desc":
        sortOptions = { price: -1 };
        break;
      case "name-asc":
        sortOptions = { title: 1 };
        break;
      case "name-desc":
        sortOptions = { title: -1 };
        break;
      case "rating-desc":
        sortOptions = { rating: -1 };
        break;
      case "stock-desc":
        sortOptions = { stock: -1 };
        break;
      case "stock-asc":
        sortOptions = { stock: 1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    if (search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");

      filter = {
        $or: [
          { title: searchRegex },
          { brand: searchRegex },
          { category: searchRegex },
        ],
      };
    }

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    return sendJson(res, 200, {
      success: true,
      data: products,
      limit,
      total,
      skip,
    });
  } catch (error) {
    if (!res.writableEnded) {
      return sendJson(res, 500, {
        message: "Server error",
        details: error.message,
      });
    }
  }
}

async function getProdutStats(req, res) {
  try {
    const [generalStats] = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalValue: { $sum: "$price" },
          avgPrice: { $avg: "$price" },
          avgRating: { $avg: "$rating" },
          outOfStockCount: {
            $sum: {
              $cond: [
                { $in: ["$availabilityStatus", ["Low Stock", "Out of Stock"]] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const categoryStats = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalValue: { $sum: "$price" },
          avgPrice: { $avg: "$price" },
        },
      },
      { $sort: { totalValue: -1 } },
    ]);

    return sendJson(res, 200, {
      general: generalStats || {
        totalItems: 0,
        totalValue: 0,
        avgPrice: 0,
        avgRating: 0,
        outOfStockCount: 0,
      },
      categories: categoryStats,
    });
  } catch (err) {
    if (!res.writableEnded) {
      return sendJson(res, 500, {
        message: "Server error",
        details: error.message,
      });
    }
  }
}

async function getProductById(req, res) {
  try {
    const parts = req.url.split("/");

    if (parts[1] === "products" && parts[2]) {
      const productId = parts[2];

      const { error } = await idValidator.validate(productId);

      if (error) {
        return sendJson(res, 400, { message: "Product id is not valid" });
      }

      const product = await Product.findById(productId);

      if (!product) {
        return sendJson(res, 400, {
          message: `Product with id ${productId} not found`,
        });
      }

      return sendJson(res, 200, {
        success: true,
        product,
      });
    }
  } catch (error) {
    if (!res.writableEnded) {
      return sendJson(res, 500, {
        message: "Server error",
        details: error.message,
      });
    }
  }
}

async function updateProductById(req, res) {
  const productId = req.url.split("/")[2];
  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return sendJson(res, 400, { success: false, message: err.message });
    }

    try {
      const { error } = await idValidator.validate(productId);

      if (error) {
        return sendJson(res, 400, { message: "Product id is not valid" });
      }

      const getField = (name) =>
        Array.isArray(fields[name]) ? fields[name][0] : fields[name];
      const uploadedFile = Array.isArray(files.image)
        ? files.image[0]
        : files.image;

      const updateData = {
        title: getField("title"),
        price: Number(getField("price")),
        category: getField("category"),
        brand: getField("brand"),
        rating: Number(getField("rating")),
        stock: getField("stock"),
        availabilityStatus: getField("availabilityStatus"),
        description: getField("description"),
        image: getField("image"),
      };

      if (uploadedFile && uploadedFile.filepath) {
        const uploadResult = await cloudinary.uploader.upload(
          uploadedFile.filepath,
          {
            folder: "products",
          },
        );
        updateData.image = uploadResult.secure_url;
        fs.unlink(uploadedFile.filepath, () => {});
      }

      const { error: productError } = productValidator.validate(updateData);

      if (productError) {
        return sendJson(res, 400, { message: productError.details[0].message });
      }

      const product = await Product.findByIdAndUpdate(productId, updateData);
      if (!product) {
        return sendJson(res, 400, {
          message: `Product with id ${productId} not found`,
        });
      }

      return sendJson(res, 200, {
        success: true,
        product,
      });
    } catch (err) {
      console.log(err);
      if (!res.writableEnded) {
        return sendJson(res, 500, {
          message: "Server error",
          details: err.message,
        });
      }
    }
  });
}

async function createProduct(req, res) {
  const form = new formidable.IncomingForm({
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return sendJson(res, 400, { success: false, message: err.message });
    }

    try {
      const getField = (name) =>
        Array.isArray(fields[name]) ? fields[name][0] : fields[name];
      const uploadedFile = Array.isArray(files.image)
        ? files.image[0]
        : files.image;

      const uploadedData = {
        title: getField("title"),
        price: Number(getField("price")),
        category: getField("category"),
        brand: getField("brand"),
        rating: Number(getField("rating")),
        stock: getField("stock"),
        availabilityStatus: getField("availabilityStatus"),
        description: getField("description"),
      };

      if (uploadedFile && uploadedFile.filepath) {
        const uploadResult = await cloudinary.uploader.upload(
          uploadedFile.filepath,
          {
            folder: "products",
          },
        );
        uploadedData.image = uploadResult.secure_url;
        fs.unlink(uploadedFile.filepath, () => {});
      }

      const { error } = productValidator.validate(uploadedData);

      if (error) {
        return sendJson(res, 400, { message: error.details[0].message });
      }

      const product = await Product.create(uploadedData);

      return sendJson(res, 200, {
        success: true,
        product,
      });
    } catch (err) {
      if (!res.writableEnded) {
        return sendJson(res, 500, {
          message: "Server error",
          details: error.message,
        });
      }
    }
  });
}

async function deleteProductById(req, res) {
  try {
    const parts = req.url.split("/");

    if (parts[1] === "products" && parts[2]) {
      const productId = parts[2];

      const { error } = await idValidator.validate(productId);

      if (error) {
        return sendJson(res, 400, { message: "Product id is not valid" });
      }

      const product = await Product.findByIdAndDelete(productId);
      if (!product) {
        return sendJson(res, 400, {
          message: `Product with id ${productId} not found`,
        });
      }

      return sendJson(res, 201, {
        success: true,
        message: "Successful deleted",
      });
    }
  } catch (error) {
    if (!res.writableEnded) {
      return sendJson(res, 500, {
        message: "Server error",
        details: error.message,
      });
    }
  }
}

async function addProductReview(req, res) {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const parts = req.url.split("/");

      if (parts[1] === "products" && parts[2] && parts[3]) {
        const productId = parts[2];

        const { error } = await idValidator.validate(productId);

        if (error) {
          return sendJson(res, 400, { message: "Product id is not valid" });
        }

        const parsedBody = JSON.parse(body || "{}");
        const { error: produtReviewError } =
          await productReviewValidator.validate(parsedBody);

        if (produtReviewError) {
          return sendJson(res, 400, {
            message: produtReviewError.details[0].message,
          });
        }

        const productById = await Product.findOne({ _id: productId });

        if (!productById) {
          return sendJson(res, 400, { message: "Product not exists" });
        }

        const { rating, comment, username } = parsedBody;
        const { user } = req;

        const newReview = {
          userId: user._id,
          username,
          rating: Number(rating),
          comment,
        };

        productById.reviews.push(newReview);
        const totalRating = productById.reviews.reduce(
          (sum, r) => sum + r.rating,
          0,
        );
        productById.rating = Number(
          (totalRating / productById.reviews.length).toFixed(1),
        );

        await productById.save();

        return sendJson(res, 201, {
          message: "Review added successfully",
          productById,
        });
      }

      return sendJson(res, 400, { message: "Product id is not provided" });
    } catch (error) {
      if (!res.writableEnded) {
        return sendJson(res, 500, {
          message: "Server error",
          details: error.message,
        });
      }
    }
  });
}

module.exports = {
  getProducts,
  getProductById,
  updateProductById,
  createProduct,
  deleteProductById,
  getProdutStats,
  addProductReview
};
