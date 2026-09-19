const Joi = require("joi");

module.exports = Joi.object({
  firstname: Joi.string().required().min(3).max(40),
  lastname: Joi.string().required().min(3).max(40),
  email: Joi.string()
    .regex(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$/)
    .required(),

  phone: Joi.string()
    .trim()
    .pattern(/^\+?[0-9]{10,15}$/)
    .required(),

  city: Joi.string().trim().min(2).max(100).required(),

  deliveryService: Joi.string().valid("mail", "courier").required(),

  address: Joi.string().trim().min(3).max(255).required(),

  paymentMethod: Joi.string().valid("card", "cash").required(),

  items: Joi.object()
    .pattern(/^[0-9a-fA-F]{24}$/, Joi.number().integer().min(1).required())
    .min(1)
    .required(),
});
