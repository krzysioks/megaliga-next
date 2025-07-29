'use server';
import mongoose from 'mongoose';

interface FormValues {
    username: string;
    password: string;
}

export const formSubmit = async (data: FormValues) => {
    console.log('SERVER ACTION:', data);

    // try {
    //     // Connect to MongoDB
    //     await mongoose.connect(
    //         'mongodb+srv://<user>:<password>@kp-cluster.9wm4hdz.mongodb.net/db-megaliga-next-dev?retryWrites=true&w=majority&appName=KP-cluster'
    //     );
    //     console.log('Connected to MongoDB');
    // } catch (error) {
    //     console.error('MongoDB connection error:', error);
    //     mongoose.connection.close();
    // }

    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                status: 'error',
                message: 'Something went wrong'
            });
        }, 2000);
    });
};
