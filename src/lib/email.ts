import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}) : null;

export const sendEmail = async (to: string, subject: string, html: string) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[EMAIL SIMULATION] To: ${to}, Subject: ${subject}`);
    return;
  }

  const from = process.env.EMAIL_FROM || 'Povezi.me <notifikacije@povezi.me>';

  try {
    if (resend) {
      await resend.emails.send({ from, to, subject, html });
    } else if (transporter) {
      await transporter.sendMail({ from, to, subject, html });
    } else {
      console.warn('Email provider not configured. Set RESEND_API_KEY or SMTP variables.');
    }
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};
