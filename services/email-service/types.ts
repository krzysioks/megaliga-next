export type SendEmailInputType = {
    to: string | string[];
    subject: string;
    text: string;
    html: string;
    from?: string;
    replyTo?: string;
};

export type SendPasswordResetEmailInputType = {
    to: string;
    resetUrl: string;
    username: string;
};
