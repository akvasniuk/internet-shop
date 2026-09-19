const Joi = require("joi");

module.exports = Joi.object({
  firstname: Joi.string().required().min(3).max(40),
  lastname: Joi.string().required().min(3).max(40),
  email: Joi.string()
    .regex(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$/)
    .required(),
  password: Joi.string().min(8).max(256).required(),
});
