import { createWorker } from '@infrastructure/queue/bullmq';
import { sendMailDirect } from '@infrastructure/mailer/mailer';
import { logger } from '@shared/logger/pino';

interface EmailJobData extends Record<string, unknown> {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export const startEmailWorker = () => {
  const worker = createWorker<EmailJobData>(
    'email',
    async (data, jobName) => {
      logger.info({ jobName, to: data.to, subject: data.subject }, 'Processing email job');
      await sendMailDirect({
        to: data.to,
        subject: data.subject,
        html: data.html,
        from: data.from,
      });
    },
    { concurrency: 3 },
  );

  logger.info('Email worker started');
  return worker;
};
