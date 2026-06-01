import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import NotificationsModel, { FindByIdType } from '@/db/models/notifications';
import UserModel from '@/db/models/user';

// connect to test db before running tests
beforeAll(async () => {
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test tear down clear database
beforeEach(async () => {
    await UserModel.deleteMany();
    await NotificationsModel.deleteMany();
});

//close connection to server so, that test suite will close
afterAll(async () => {
    await UserModel.deleteMany();
    await NotificationsModel.deleteMany();
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
    test('Should fetch all active notifications for given user', async () => {
        const userOne = await new UserModel({
            username: 'user-one',
            coachName: 'Coach One',
            email: 'user-one@example.com',
            password: 'Password1!',
            teamName: 'Team One',
            logoUrl: 'https://example.com/team-one.png',
            reachedPlayoff: false,
            isFirstRoundDraftOrderDraw: false,
            groupName: new mongoose.Types.ObjectId().toString(),
            bio: 'User one bio',
            cabinetTrophy: [],
            isAdmin: false
        }).save();

        const userTwo = await new UserModel({
            username: 'user-two',
            coachName: 'Coach Two',
            email: 'user-two@example.com',
            password: 'Password1!',
            teamName: 'Team Two',
            logoUrl: 'https://example.com/team-two.png',
            reachedPlayoff: false,
            isFirstRoundDraftOrderDraw: false,
            groupName: new mongoose.Types.ObjectId().toString(),
            bio: 'User two bio',
            cabinetTrophy: [],
            isAdmin: false
        }).save();

        const userOneId = userOne._id.toString();
        const userTwoId = userTwo._id.toString();

        await NotificationsModel.create([
            {
                message: 'Inactive notification without dismissed users',
                status: 'inactive',
                isDissmissible: true,
                dismissedUserIds: []
            },
            {
                message: 'Inactive notification dismissed by user one',
                status: 'inactive',
                isDissmissible: true,
                dismissedUserIds: [userOneId]
            },
            {
                message: 'Inactive notification dismissed by user two',
                status: 'inactive',
                isDissmissible: true,
                dismissedUserIds: [userTwoId]
            },
            {
                message: 'Active notification without dismissed users',
                status: 'active',
                isDissmissible: true,
                dismissedUserIds: []
            },
            {
                message: 'Active notification dismissed by user one',
                status: 'active',
                isDissmissible: true,
                dismissedUserIds: [userOneId]
            },
            {
                message: 'Active notification dismissed by user two',
                status: 'active',
                isDissmissible: true,
                dismissedUserIds: [userTwoId]
            },
            {
                message: 'Active notification dismissed by both users',
                status: 'active',
                isDissmissible: true,
                dismissedUserIds: [userOneId, userTwoId]
            }
        ]);

        const userOneNotifications =
            await NotificationsModel.getAllActiveNotifications(userOneId);
        const userTwoNotifications =
            await NotificationsModel.getAllActiveNotifications(userTwoId);

        expect(
            userOneNotifications.map(({ message }) => message).sort()
        ).toEqual([
            'Active notification dismissed by user two',
            'Active notification without dismissed users'
        ]);
        expect(
            userTwoNotifications.map(({ message }) => message).sort()
        ).toEqual([
            'Active notification dismissed by user one',
            'Active notification without dismissed users'
        ]);
    });
    test('Should dismiss dismissable notification', async () => {
        const user = await new UserModel({
            username: 'user-one',
            coachName: 'Coach One',
            email: 'user-one@example.com',
            password: 'Password1!',
            teamName: 'Team One',
            logoUrl: 'https://example.com/team-one.png',
            reachedPlayoff: false,
            isFirstRoundDraftOrderDraw: false,
            groupName: new mongoose.Types.ObjectId().toString(),
            bio: 'User one bio',
            cabinetTrophy: [],
            isAdmin: false
        }).save();
        const userId = user._id.toString();
        const notification = new NotificationsModel({
            message: 'Dismissable notification',
            status: 'active',
            isDissmissible: true
        });
        await notification.save();
        const notificationId = notification._id.toString();

        await notification.setIsDismissed(userId);
        const updatedNotification: FindByIdType =
            await NotificationsModel.findById(notificationId).exec();
        expect(updatedNotification).not.toBeNull();
        expect(updatedNotification?.dismissedUserIds.map(String)).toContain(
            userId
        );
    });
    test('Should not dismiss not dismissable notification', async () => {
        const user = await new UserModel({
            username: 'user-one',
            coachName: 'Coach One',
            email: 'user-one@example.com',
            password: 'Password1!',
            teamName: 'Team One',
            logoUrl: 'https://example.com/team-one.png',
            reachedPlayoff: false,
            isFirstRoundDraftOrderDraw: false,
            groupName: new mongoose.Types.ObjectId().toString(),
            bio: 'User one bio',
            cabinetTrophy: [],
            isAdmin: false
        }).save();
        const userId = user._id.toString();
        const notification = new NotificationsModel({
            message: 'Dismissable notification',
            status: 'active',
            isDissmissible: false
        });
        await notification.save();
        await expect(notification.setIsDismissed(userId)).rejects.toThrow(
            'Notification is not dismissible'
        );
    });
});
