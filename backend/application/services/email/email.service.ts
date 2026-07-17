import { renderFile } from 'ejs';
import { Service } from 'fastify-decorators';
import { join } from 'node:path';
import nodemailer from 'nodemailer';

import { Setting } from '@application/model/setting.model';
import { buildNodemailerConfig, resolveEmailFrom } from '@config/email.config';

import {
  EmailContractService,
  type EmailOptions,
  type EmailResult,
} from './email-contract.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Service()
export default class NodemailerEmailService implements EmailContractService {
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const setting = await Setting.findOne().lean();
    if (!setting) {
      console.warn(
        '[NodemailerEmailService] SMTP nao configurado (nenhum documento Setting)',
      );
      return { success: false, message: 'SMTP nao configurado' };
    }

    const transportConfig = buildNodemailerConfig(setting);
    if (!transportConfig) {
      console.warn(
        '[NodemailerEmailService] SMTP nao configurado (credenciais ausentes em Setting)',
      );
      return { success: false, message: 'SMTP nao configurado' };
    }

    const validEmails = options.to.filter((email) => EMAIL_REGEX.test(email));
    if (validEmails.length === 0) {
      return { success: false, message: 'Nenhum email valido fornecido' };
    }

    try {
      const transporter = nodemailer.createTransport(transportConfig);

      const from = options.from ?? resolveEmailFrom(setting) ?? undefined;

      const result = await transporter.sendMail({
        from,
        to: validEmails.join(', '),
        subject: options.subject,
        html: options.body,
        text: options.body.replace(/<[^>]*>/g, ''),
      });

      let testUrl: string | boolean | undefined;
      if (process.env.NODE_ENV !== 'production') {
        const url = nodemailer.getTestMessageUrl(result);
        if (url) testUrl = url;
      }

      return {
        success: true,
        message: 'Email enviado com sucesso',
        testUrl,
      };
    } catch (error: unknown) {
      let errorMessage = 'Unknown error';
      if (error instanceof Error) errorMessage = error.message;
      console.error('Erro ao enviar email:', error);
      return {
        success: false,
        message: `Erro ao enviar email: ${errorMessage}`,
      };
    }
  }

  async buildTemplate(payload: {
    template: string;
    data: Record<string, unknown>;
  }): Promise<string> {
    const file = join(
      process.cwd(),
      'templates',
      'email',
      payload.template.concat('.ejs'),
    );
    return await renderFile(file, payload.data);
  }
}
