const nodemailer = require("nodemailer");
const {
  EMAIL_SERVICE,
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
} = require("../config/env");

let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  if (EMAIL_HOST && EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT) || 587,
      secure: Number(EMAIL_PORT) === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  } else if (EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: EMAIL_SERVICE || "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  } else {
    // If no custom SMTP credentials provided, create Ethereal test transporter
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[EMAIL] Initialized Ethereal test account: ${testAccount.user}`);
    } catch (err) {
      console.error("[EMAIL] Failed to create Ethereal test account, falling back to stream:", err.message);
      transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: "windows",
      });
    }
  }

  return transporter;
};

const sendPasswordResetEmail = async (toEmail, userName, otp) => {
  const mailTransporter = await getTransporter();

  const mailOptions = {
    from: EMAIL_FROM || '"LogiBrain Support" <no-reply@logibrain.com>',
    to: toEmail,
    subject: "Your LogiBrain Password Reset Code",
    text: `Hello ${userName || "User"},\n\nYour password reset verification code is: ${otp}\n\nThis code is valid for 15 minutes. If you did not request this, please ignore this email.\n\nBest regards,\nLogiBrain Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="margin-bottom: 20px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: bold;">LogiBrain</h2>
        </div>
        <h3 style="color: #1e293b; margin-top: 0; font-size: 18px;">Password Reset Code</h3>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">
          Hello <strong>${userName || "User"}</strong>,
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">
          We received a request to reset your LogiBrain account password. Enter the 6-digit verification code below to proceed:
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0284c7; font-family: monospace;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.4;">
          This verification code will expire in <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} LogiBrain Fleet Management. All rights reserved.
        </p>
      </div>
    `,
  };

  const info = await mailTransporter.sendMail(mailOptions);
  console.log(`[EMAIL] Password reset email sent to ${toEmail}. MessageId: ${info.messageId}`);
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[EMAIL] Ethereal Email Preview URL: ${previewUrl}`);
  }
  return info;
};

module.exports = { sendPasswordResetEmail, getTransporter };
