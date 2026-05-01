// CJS wrapper — require() traverses node_modules correctly; dynamic import() loads ESM server
const serverless = require("serverless-http");

let cachedHandler;

exports.handler = async function (event, context) {
  if (!cachedHandler) {
    const { app } = await import("../../server/index.js");
    cachedHandler = serverless(app);
  }
  return cachedHandler(event, context);
};
