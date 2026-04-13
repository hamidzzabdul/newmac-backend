const { Resend } = require("resend");

const resend = new Resend(process.env.RESENDAPI_KEY);

module.exports = resend;
