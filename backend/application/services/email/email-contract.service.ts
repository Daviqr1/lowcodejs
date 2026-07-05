/* eslint-disable no-unused-vars */
export type EmailOptions = {
  to: string[];
  subject: string;
  body: string;
  from?: string;
}

export type EmailResult = {
  success: boolean;
  message: string;
  testUrl?: string | boolean;
}

export abstract class EmailContractService {
  abstract sendEmail(options: EmailOptions): Promise<EmailResult>;
  abstract buildTemplate(payload: {
    template: string;
    data: Record<string, unknown>;
  }): Promise<string>;
}
