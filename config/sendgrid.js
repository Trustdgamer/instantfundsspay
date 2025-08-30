// config/sendgrid.js
const sgMail = require("@sendgrid/mail");

// set your SendGrid API key from environment variables
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

module.exports = sgMail;
