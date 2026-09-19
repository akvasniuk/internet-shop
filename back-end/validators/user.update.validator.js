const Joi = require("joi");

module.exports = Joi.object({
  firstname: Joi.string().min(3).max(40),
  lastname: Joi.string().min(3).max(40),
  password: Joi.string().min(8).max(256),
  newPassword: Joi.string().min(8).max(256),
});
