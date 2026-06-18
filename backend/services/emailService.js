const nodemailer = require('nodemailer');

/**
 * Send an email using either Resend (if RESEND_API_KEY is configured) or standard SMTP fallback.
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
  // If Resend API key is configured, use the professional Resend service
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your_resend_api_key') {
    try {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const defaultFrom = process.env.FROM_EMAIL || 'Kwickbot <onboarding@resend.dev>';
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
  if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'your_email@gmail.com') {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const defaultFrom = `"Kwickbot" <${process.env.SMTP_USER}>`;
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
