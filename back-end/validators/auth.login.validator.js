const Joi = require("joi");

module.exports = Joi.object({
  email: Joi.string()
    .regex(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$/)
    .required(),
  password: Joi.string().min(8).max(100).required(),
});
