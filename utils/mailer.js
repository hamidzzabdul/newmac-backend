const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // your gmail address
    pass: process.env.GMAIL_APP_PASSWORD, // gmail app password (not your login password)
  },
});

module.exports = transporter;
