const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.join(__dirname, "..", ".env"),
});

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getEnv(name, defaultValue = '') {
  return process.env[name] || defaultValue;
}

module.exports = {
  getRequiredEnv,
  getEnv,
};


module.exports = {
  getRequiredEnv,
};
