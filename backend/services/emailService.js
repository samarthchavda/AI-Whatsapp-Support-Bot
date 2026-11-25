const nodemailer = require('nodemailer');
const runtimeConfig = require('./runtimeConfigService');

/**
 * Send an email using either Resend (if RESEND_API_KEY is configured) or standard SMTP fallback.
 * Reads credentials dynamically via runtimeConfigService (DB override -> .env fallback).
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML content of the email
 * @param {string} options.text - Plain text content fallback of the email (highly recommended to prevent spam filtering)
 * @param {string} [options.from] - Optional sender override (e.g. '"Kwickbot" <support@kwickbot.com>')
 * @returns {Promise<Object>} Result details
 */
async function sendEmail({ to, subject, html, text, from }) {
  const [
    resendApiKey,
    fromEmailConfig,
    smtpUser,
    smtpPass,
    smtpHost,
    smtpPortRaw,
    smtpSecureRaw
  ] = await Promise.all([
    runtimeConfig.get('resend_api_key'),
    runtimeConfig.get('from_email'),
    runtimeConfig.get('smtp_user'),
    runtimeConfig.get('smtp_pass'),
    runtimeConfig.get('smtp_host', 'smtp.gmail.com'),
    runtimeConfig.get('smtp_port', '587'),
    runtimeConfig.get('smtp_secure', 'false')
  ]);

  // If Resend API key is configured, use the professional Resend service
  if (resendApiKey && resendApiKey !== 'your_resend_api_key') {
    try {
      const { Resend } = require('resend');
      const resend = new Resend(resendApiKey);

      const defaultFrom = fromEmailConfig || 'Kwickbot <onboarding@resend.dev>';
      const sender = from || defaultFrom;

      console.log(`✉️ Dispatching email via Resend to ${to} (Sender: ${sender})...`);

      const { data, error } = await resend.emails.send({
        from: sender,
        to: to,
        subject: subject,
        html: html,
        text: text
      });

      if (error) {
        throw new Error(error.message || JSON.stringify(error));
      }

      console.log(`✅ Email sent successfully via Resend. ID: ${data?.id}`);
      return { success: true, provider: 'resend', id: data?.id };
    } catch (err) {
      console.error('❌ Resend delivery failed, attempting SMTP fallback:', err.message);
      // Fallback to SMTP on error
    }
  }

  // Fallback: Use standard Nodemailer SMTP
  if (smtpUser && smtpPass && smtpUser !== 'your_email@gmail.com') {
    try {
      const smtpPort = parseInt(smtpPortRaw, 10) || 587;
      const isSecure = String(smtpSecureRaw).toLowerCase() === 'true' || smtpPort === 465;

      const transporter = nodemailer.createTransport({
        host: smtpHost || 'smtp.gmail.com',
        port: smtpPort,
        secure: isSecure,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const defaultFrom = fromEmailConfig || `"Kwickbot" <${smtpUser}>`;
      const sender = from || defaultFrom;

      console.log(`✉️ Dispatching email via SMTP to ${to} (Sender: ${sender})...`);

      const info = await transporter.sendMail({
        from: sender,
        to: to,
        subject: subject,
        html: html,
        text: text
      });

      console.log(`✅ Email sent successfully via SMTP. Message ID: ${info.messageId}`);
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.error('❌ SMTP delivery failed:', err.message);
      throw err;
    }
  }

  console.log('⚠️ No email delivery credentials configured (RESEND_API_KEY or SMTP_USER missing). Email skipped.');
  return { success: false, provider: 'none', message: 'No credentials configured' };
}

module.exports = { sendEmail };
