import nodemailer from 'nodemailer';
import { env } from '@shared/config/env';
import { logger } from '@shared/logger/pino';
import { enqueue } from '@infrastructure/queue/bullmq';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: env.ADMIN_EMAIL,
    pass: env.ADMIN_PASSWORD,
  },
});

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send email directly (used inside the queue worker).
 */
export const sendMailDirect = async (opts: MailOptions): Promise<void> => {
  await transporter.sendMail({
    from: opts.from ?? `XBensieve Support Team <${env.ADMIN_EMAIL}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  logger.info({ to: opts.to, subject: opts.subject }, 'Email sent');
};

/**
 * Enqueue an email for reliable async delivery via BullMQ.
 * This is the default way to send emails from the application.
 */
export const sendMail = async (opts: MailOptions): Promise<void> => {
  await enqueue('email', 'send-email', {
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    from: opts.from,
  });
  logger.debug({ to: opts.to, subject: opts.subject }, 'Email queued');
};
