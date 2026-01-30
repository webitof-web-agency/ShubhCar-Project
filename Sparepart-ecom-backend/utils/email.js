const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: env.SMTP_SECURE === 'true',
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

// transporter.verify((err) => {
//   if (err) {
//     logger.error('❌ SMTP not ready', err);
//   } else {
//     logger.info('🟢 SMTP ready');
//   }
// });

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"${env.APP_NAME}" <${env.SMTP_FROM}>`,
    to,
    subject,
    html,
  });
};

module.exports = { sendEmail };
