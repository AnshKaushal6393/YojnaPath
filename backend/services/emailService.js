const nodemailer = require('nodemailer');
const { getRequiredEnv, getEnv } = require('../config/env');


let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  const host = getEnv('EMAIL_HOST') || 'smtp.gmail.com';
  const port = Number(getEnv('EMAIL_PORT', '587'));
  const user = getRequiredEnv('EMAIL_USER');
  const pass = getRequiredEnv('EMAIL_PASS');
  const from = getEnv('EMAIL_FROM', user);

  transporter = nodemailer.createTransporter({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    pool: true,
    maxConnections: 1,
    maxMessages: 5,
  });

  // Test connection
  await transporter.verify();
  console.log(`[email] Connected to ${host}:${port}`);

  return transporter;
}


async function sendOtpEmail(to, otp) {
  const transporter = await getTransporter();
  const subject = `Your YojnaPath OTP is ${otp}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
      <h2>Your YojnaPath Login OTP</h2>
      <p style="font-size: 24px; letter-spacing: 4px; font-weight: bold; color: #059669; text-align: center; margin: 20px 0;">
        ${otp}
      </p>
      <p>This OTP expires in 5 minutes. Do not share it.</p>
      <p>If you didn't request this, ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text: `Your YojnaPath OTP: ${otp}. Expires in 5 minutes.`
  });
}

module.exports = { sendOtpEmail };

