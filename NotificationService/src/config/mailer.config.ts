import nodemailer from 'nodemailer';
import { serverConfig } from './index';
export const transporter = nodemailer.createTransport({
  host: serverConfig.SMTP_HOST,
  port: serverConfig.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  ...(serverConfig.SMTP_USER ? { auth: { user: serverConfig.SMTP_USER, pass: serverConfig.SMTP_PASS } } : {}),
  connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
});
