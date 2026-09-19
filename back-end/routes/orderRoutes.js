const { createOrder, getOrders } = require("../controllers/orderController");
const { verifyAuth } = require("../helpers/verifyAuth");

async function handleOrderRoutes(req, res) {
  const { method, url } = req;
  const baseURL = "http://" + req.headers.host;
  const { pathname } = new URL(req.url, baseURL);

  const createOrderMatch = pathname.match(/^\/orders\/([^/]+)$/);
  if (createOrderMatch && method === "POST") {
    const isAuth = await verifyAuth(req, res);

    if (!isAuth) {
      return true;
    }

    await createOrder(req, res);
    return true;
  }

  const getOrdersMatch = pathname.match(/^\/orders\/([^/]+)$/);
  if (getOrdersMatch && method === "GET") {
    const isAuth = await verifyAuth(req, res);

    if (!isAuth) {
      return true;
    }

    await getOrders(req, res);
    return true;
  }

  return false;
}

module.exports = handleOrderRoutes;
