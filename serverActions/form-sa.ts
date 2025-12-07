'use server';
import { DBClient } from '@/db/db-client';

interface FormValues {
    username: string;
    password: string;
}

export const formSubmit = async (_data: FormValues) => {
    const dbClient = new DBClient();
    await dbClient.connect();

    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                status: 'error',
                message: 'Something went wrong'
            });
        }, 2000);
    });
};
