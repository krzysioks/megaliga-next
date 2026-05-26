'use server';

import { DBClient } from '@/db/db-client';
// import NotificationsModel from '@/db/models/notifications';
import UserModel from '@/db/models/user';

interface FormValues {
    username: string;
    password: string;
}

export const formSubmit = async (data: FormValues) => {
    const dbClient = new DBClient();
    await dbClient.connect();
    try {
        const user = new UserModel({
            username: data.username,
            coachName: 'Boby',
            email: `${data.username}@wp.pl`,
            password: data.password,
            teamName: 'TeamTest',
            logoUrl: 'http://example.com/logo.png'
        });
        await user.save();

        // const notification = new NotificationsModel({
        //     message: 'New notification',
        //     status: 'active',
        //     isDissmissible: true
        // });
        // await notification.save();

        // await notification.setIsDismissed(user._id.toString());
        // const notifications =
        //     await NotificationsModel.getAllActiveNotifications(
        //         user._id.toString()
        //     );
        // console.log('Active notifications for user:', notifications);
    } catch (error) {
        console.error('Error saving user:', error);
    }

    // return new Promise(resolve => {
    //     setTimeout(() => {
    //         resolve({
    //             status: 'error',
    //             message: 'Something went wrong'
    //         });
    //     }, 2000);
    // });
};
