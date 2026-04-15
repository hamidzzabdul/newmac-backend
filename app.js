const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const app = express();

const globalErrorHandler = require("./controllers/ErrorController");
const productRouter = require("./routes/ProductRoutes");
const orderRouter = require("./routes/OrderRoutes");
const userRouter = require("./routes/UserRoutes");
const contactRoutes = require("./routes/Contact");
const notificationsroutes = require("./routes/notification");
const PaystacksController = require("./controllers/PaystacksController");

// CORS
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Disposition", "Content-Length", "Content-Type"],
    credentials: true,
  }),
);

// Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Paystack webhook
// MUST come before express.json()
app.post(
  "/api/v1/orders/paystack/webhook",
  express.raw({ type: "*/*" }),
  PaystacksController.paystackWebhook,
);

// Body parsers
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Static uploads
app.use("/api/v1/uploads", express.static("public/uploads"));

// Health check
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
  });
});

// Routes
app.use("/api/v1/products", productRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1", contactRoutes);
app.use("/api/v1/notifications", notificationsroutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: `Can't find ${req.originalUrl} on this server!`,
  });
});

// Global error handler
app.use(globalErrorHandler);

module.exports = app;

// the autodeploy works
