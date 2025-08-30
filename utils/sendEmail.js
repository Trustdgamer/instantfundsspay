const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(to, subject, html) {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM, // must be a verified sender in SendGrid
    subject,
    html,
  };

  await sgMail.send(msg);
}

module.exports = sendEmail;
