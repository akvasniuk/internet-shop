const Joi = require("joi");

module.exports = Joi.object({
  title: Joi.string().trim().min(3).max(150).required(),

  description: Joi.string().trim().min(10).max(2000).required(),

  category: Joi.string().trim().min(2).max(50).required(),

  price: Joi.number().positive().precision(2).required(),

  rating: Joi.number().min(0).max(5).required(),

  stock: Joi.string().trim().required(),

  image: Joi.string().trim().uri().required(),

  brand: Joi.string().trim().min(2).max(50).required(),

  availabilityStatus: Joi.string()
    .valid("In Stock", "Low Stock", "Out of Stock")
    .required(),
});
