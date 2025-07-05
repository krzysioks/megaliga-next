'use server';
interface FormValues {
    username: string;
    password: string;
}

export const formSubmit = async (data: FormValues) => {
    console.log('SERVER ACTION:', data);

    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                status: 'error',
                message: 'Something went wrong'
            });
        }, 2000);
    });
};
