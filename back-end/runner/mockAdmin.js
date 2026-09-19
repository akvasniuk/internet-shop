const User = require("../models/User");
const userValidator = require("../validators/user.validator");

async function seedAdminUser() {
  try {
    const isAdminExist = await User.findOne({
      email: "admin.product@gmail.com",
    });

    if (isAdminExist) {
      return;
    }

    const admin = {
      firstname: "Admin",
      lastname: "Product",
      email: "admin.product@gmail.com",
      password: process.env.ADMIN_ACCOUNT_PASSWORD,
    };

    const { error } = await userValidator.validate(admin);

    if (error) {
      throw new Error(error.details[0].message);
    }

    const newAdmin = await User.create({
      ...admin,
      role: "ADMIN",
    });

    console.log(`Successfully saved ${newAdmin._id} admin user`);
  } catch (error) {
    console.error("Error while saving admin user: ", error.message);
  }
}

module.exports = seedAdminUser;
