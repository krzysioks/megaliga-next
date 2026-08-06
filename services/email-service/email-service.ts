import 'server-only';

import type {
    SendEmailInputType,
    SendPasswordResetEmailInputType
} from '@/services/email-service/types';

import nodemailer, { type Transporter } from 'nodemailer';

export class EmailService {
    private transporter: Transporter | null = null;

    private getTransporter(): Transporter {
        if (this.transporter) {
            return this.transporter;
        }

        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: true,
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 20000,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        return this.transporter;
    }

    public async verifyConnection(): Promise<void> {
        await this.getTransporter().verify();
    }

    public async sendEmail(input: SendEmailInputType) {
        return this.getTransporter().sendMail({
            from: input.from ?? process.env.SMTP_FROM,
            to: input.to,
            subject: input.subject,
            text: input.text,
            html: input.html,
            replyTo: input.replyTo
        });
    }

    public async sendPasswordResetEmail(
        input: SendPasswordResetEmailInputType
    ) {
        const greeting = `Cześć ${input.username},`;

        const subject = 'Reset hasła';
        const text =
            `${greeting}\n\n` +
            'Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.\n' +
            `Aby ustawić nowe hasło, kliknij link:\n${input.resetUrl}\n\n` +
            'Jeśli to nie Ty, zignoruj tę wiadomość.';
        const html =
            `<p>${greeting}</p>` +
            '<p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.</p>' +
            `<p><a href="${input.resetUrl}">Ustaw nowe hasło</a></p>` +
            '<p>Jeśli to nie Ty, zignoruj tę wiadomość.</p>';

        return this.sendEmail({
            to: input.to,
            subject,
            text,
            html
        });
    }
}

export const emailService = new EmailService();

export default emailService;
