import { emailService } from '@/services/email-service/email-service';

describe('Test EmailService methods', () => {
    beforeAll(() => {
        const requiredVars = [
            'SMTP_HOST',
            'SMTP_PORT',
            'SMTP_USER',
            'SMTP_PASS',
            'SMTP_FROM'
        ] as const;

        const missingVars = requiredVars.filter(name => !process.env[name]);

        if (missingVars.length > 0) {
            throw new Error(
                `Missing SMTP env vars for integration tests: ${missingVars.join(', ')}`
            );
        }
    });

    test('it should successfuly verify connection', async () => {
        await expect(emailService.verifyConnection()).resolves.toBeUndefined();
    });

    test('it should send reset password successfuly', async () => {
        const sendEmailSpy = jest.spyOn(emailService, 'sendEmail');

        const result = await emailService.sendPasswordResetEmail({
            to: 'krzysiox@o2.pl',
            resetUrl:
                'https://megaliga-next-dev.megaliga.eu/reset-password?token=test-token',
            username: 'Krzysztof'
        });

        expect(sendEmailSpy).toHaveBeenCalledTimes(1);
        expect(sendEmailSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                to: 'krzysiox@o2.pl',
                subject: 'Reset hasła'
            })
        );

        expect(result).toBeDefined();
        expect(result.messageId).toBeDefined();

        sendEmailSpy.mockRestore();
    });
});
