import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import ActionCentreNotificationsModel, {
    FindByIdType,
    TYPE_ENUM
} from '@/db/models/action-centre-notifications';
import UserModel from '@/db/models/user';

// connect to test db before running tests
beforeAll(async () => {
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test tear down clear database
beforeEach(async () => {
    await UserModel.deleteMany();
});

//close connection to server so, that test suite will close
afterAll(async () => {
    await UserModel.deleteMany();
    await ActionCentreNotificationsModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test ActionCentreNotificationsModel methods and static functions', () => {
    test('Should create action centre notification for each supported type', async () => {
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

        for (const type of TYPE_ENUM) {
            const notification = new ActionCentreNotificationsModel({
                message: `New ${type} notification`,
                type,
                userId
            });
            await notification.save();
            expect(notification._id).toBeDefined();

            const foundNotification: FindByIdType =
                await ActionCentreNotificationsModel.findById(
                    notification._id
                ).exec();

            expect(foundNotification).not.toBeNull();
            expect(foundNotification?.message).toBe(`New ${type} notification`);
            expect(foundNotification?.type).toBe(type);
            expect(foundNotification?.userId?.toString()).toBe(userId);
        }
    });
    test('Should not set status if not valid one', async () => {
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
        const notification = new ActionCentreNotificationsModel({
            message: `New notification`,
            type: TYPE_ENUM[0],
            userId
        });
        await notification.save();
        const notificationId = notification._id.toString();

        await notification.setStatus('invalid_status');
        const updatedNotification: FindByIdType =
            await ActionCentreNotificationsModel.findById(
                notificationId
            ).exec();
        expect(updatedNotification).not.toBeNull();
        expect(updatedNotification?.status).not.toBe('invalid_status');
    });
    test('Should set status if valid and different', async () => {
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
        const notification = new ActionCentreNotificationsModel({
            message: `Set status test notification`,
            type: TYPE_ENUM[0],
            userId
        });
        await notification.save();
        const notificationId = notification._id.toString();

        await notification.setStatus('completed');
        const updatedNotification: FindByIdType =
            await ActionCentreNotificationsModel.findById(
                notificationId
            ).exec();
        expect(updatedNotification).not.toBeNull();
        expect(updatedNotification?.status).toBe('completed');
    });
    test('Should get all action centre notifications for given user', async () => {
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

        await ActionCentreNotificationsModel.create([
            {
                message: 'User one notification 1',
                type: TYPE_ENUM[0],
                userId: userOneId
            },
            {
                message: 'User one notification 2',
                type: TYPE_ENUM[0],
                userId: userOneId
            },
            {
                message: 'User one notification 3',
                type: TYPE_ENUM[0],
                userId: userOneId
            },
            {
                message: 'User one completed notification',
                type: TYPE_ENUM[0],
                userId: userOneId,
                status: 'completed'
            },
            {
                message: 'User two notification 1',
                type: TYPE_ENUM[1],
                userId: userTwoId
            },
            {
                message: 'User two notification 2',
                type: TYPE_ENUM[1],
                userId: userTwoId
            },
            {
                message: 'User two completed notification',
                type: TYPE_ENUM[1],
                userId: userTwoId,
                status: 'completed'
            }
        ]);

        const userOneNotifications =
            await ActionCentreNotificationsModel.getAllActionCentreNotificationsByUser(
                userOneId
            );
        const userTwoNotifications =
            await ActionCentreNotificationsModel.getAllActionCentreNotificationsByUser(
                userTwoId
            );

        expect(userOneNotifications.length).toBe(4);
        expect(userTwoNotifications.length).toBe(3);

        userOneNotifications.forEach(notification => {
            expect(notification?.userId?.toString()).toBe(userOneId);
        });
        userOneNotifications.forEach(notification => {
            expect(notification.type).toBe(TYPE_ENUM[0]);
        });

        userTwoNotifications.forEach(notification => {
            expect(notification?.userId?.toString()).toBe(userTwoId);
        });
        userTwoNotifications.forEach(notification => {
            expect(notification.type).toBe(TYPE_ENUM[1]);
        });
    });
});
