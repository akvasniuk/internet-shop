const {
  getProducts,
  getProductById,
  createProduct,
  deleteProductById,
  updateProductById,
  getProdutStats,
  addProductReview
} = require("../controllers/productController");
const { verifyAuth, verifyIsAdmin } = require("../helpers/verifyAuth");

async function handleProductRoutes(req, res) {
  const { method, url } = req;

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  if (pathname === "/products" && method === "GET") {
    await getProducts(req, res);
    return true;
  }

  if (pathname === "/products/stats" && method === "GET") {
    const isAuth = await verifyAuth(req, res);

    if (!isAuth) {
      return true;
    }

    const isAdmin = await verifyIsAdmin(req, res);

    if (!isAdmin) {
      return true;
    }

    await getProdutStats(req, res);
    return true;
  }

  const reviewsByIdMatch = pathname.match(/^\/products\/([^/]+)\/reviews$/);
  if (reviewsByIdMatch && method === "POST") {
    const isAuth = await verifyAuth(req, res);

    if (!isAuth) {
      return true;
    }

    await addProductReview(req, res);
    return true;
  }

  const productByIdMatch = pathname.match(/^\/products\/([^/]+)$/);
  if (productByIdMatch && method === "GET") {
    await getProductById(req, res);
    return true;
  }

  if (productByIdMatch && method === "PATCH") {
    const isAuth = await verifyAuth(req, res);

    if (!isAuth) {
      return true;
    }

    const isAdmin = await verifyIsAdmin(req, res);

    if (!isAdmin) {
      return true;
    }

    await updateProductById(req, res);
    return true;
  }

  if (pathname === "/products" && method === "POST") {
    const isAuth = await verifyAuth(req, res);

    if (!isAuth) {
      return true;
    }

    const isAdmin = await verifyIsAdmin(req, res);

    if (!isAdmin) {
      return true;
    }

    await createProduct(req, res);
    return true;
  }

  if (productByIdMatch && method === "DELETE") {
    const isAuth = await verifyAuth(req, res);

    if (!isAuth) {
      return true;
    }

    const isAdmin = await verifyIsAdmin(req, res);

    if (!isAdmin) {
      return true;
    }

    await deleteProductById(req, res);
    return true;
  }

  return false;
}

module.exports = handleProductRoutes;
