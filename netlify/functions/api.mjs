import serverless from "serverless-http";
import { app } from "../../server/index.js";

console.log("[api] function module loaded — wiring serverless handler");
export const handler = serverless(app);
console.log("[api] handler ready");
