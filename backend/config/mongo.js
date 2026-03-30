require("./env");

const mongoose = require("mongoose");

mongoose.set("bufferCommands", false);

let connectPromise;

async function connectMongo() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectPromise) {
    return connectPromise;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("Missing required environment variable: MONGODB_URI");
  }

  connectPromise = mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    })
    .finally(() => {
      connectPromise = null;
    });

  return connectPromise;
}

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

module.exports = {
  connectMongo,
  isMongoReady,
};
