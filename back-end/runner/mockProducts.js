const Product = require("../models/Product");

const TECH_CATEGORIES = [
  "smartphones",
  "laptops",
  "tablets",
  "mobile-accessories",
];

async function seedTechProducts() {
  try {
    const existingProducts = await Product.countDocuments();

    if (existingProducts > 0) {
      return;
    }

    const requests = TECH_CATEGORIES.map((slug) =>
      fetch(`https://dummyjson.com/products/category/${slug}`).then((res) =>
        res.json(),
      ),
    );

    const results = await Promise.all(requests);
    const allProducts = results.flatMap((data) => data.products);

    const formattedProducts = allProducts.map((item) => ({
      title: item.title,
      description: item.description,
      category: item.category,
      price: item.price,
      rating: item.rating,
      stock: item.stock,
      image: item.thumbnail,
      brand: item.brand,
      availabilityStatus: item.availabilityStatus,
    }));

    await Product.insertMany(formattedProducts);

    console.log(`Successfully saved ${formattedProducts.length} products!`);
  } catch (error) {
    console.error("Error while loading products: ", error.message);
  }
}

module.exports = seedTechProducts;
