// CJS wrapper — can dynamic import() ES modules, avoids ESM/CJS bundler issues
let cachedHandler;

exports.handler = async function (event, context) {
  if (!cachedHandler) {
    const [{ default: serverless }, { app }] = await Promise.all([
      import("serverless-http"),
      import("../../server/index.js"),
    ]);
    cachedHandler = serverless(app);
  }
  return cachedHandler(event, context);
};
