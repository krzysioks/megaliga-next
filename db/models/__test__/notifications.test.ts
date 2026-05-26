import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import NotificationsModel, { FindByIdType } from '@/db/models/notifications';

// connect to test db before running tests
beforeAll(async () => {
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test tear down clear database
beforeEach(async () => {
    await NotificationsModel.deleteMany();
});

//close connection to server so, that test suite will close
afterAll(async () => {
    await mongoose.disconnect();
});

describe('Test NotificationsModel methods and static functions', () => {
    test('Should create a notification', async () => {
        const notification = new NotificationsModel({
            message: 'New notification',
            status: 'active',
            isDissmissible: true
        });
        await notification.save();
        expect(notification._id).toBeDefined();

        const foundNotification: FindByIdType =
            await NotificationsModel.findById(notification._id).exec();
        expect(foundNotification).not.toBeNull();
        expect(foundNotification?.message).toBe('New notification');
        expect(foundNotification?.status).toBe('active');
        expect(foundNotification?.isDissmissible).toBe(true);
    });
});
