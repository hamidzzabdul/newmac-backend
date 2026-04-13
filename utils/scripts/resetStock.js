require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../../models/Product");

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD,
);

const MONGO_URI = DB || "mongodb://127.0.0.1:27017/westlands_meat";

async function resetAllStockToTen() {
  try {
    await mongoose.connect(MONGO_URI);
    const result = await Product.updateMany({}, { $set: { stockkg: 20 } });
    console.log(`Updated ${result.modifiedCount} products successfully.`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

resetAllStockToTen();
