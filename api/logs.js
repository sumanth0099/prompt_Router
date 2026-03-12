const { readLogs } = require("../src/logger");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const logs = readLogs();
  return res.status(200).json({ logs: logs.slice(-100).reverse() });
};
