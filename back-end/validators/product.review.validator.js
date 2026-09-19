const Joi = require("joi");

module.exports = Joi.object({
  username: Joi.string().trim().min(2).max(100).required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().trim().min(5).max(1000).required(),
});
