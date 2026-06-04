import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import UserModel, { FindByIdType } from '@/db/models/user';

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
    await mongoose.disconnect();
});

describe('Test UserModel methods and static functions', () => {
    test('Should get user data by userId', async () => {
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
        const fetchedUser: FindByIdType =
            await UserModel.findById(userId).exec();

        expect(fetchedUser).not.toBeNull();
        expect(fetchedUser?.username).toBe('user-one');
        expect(fetchedUser?.coachName).toBe('Coach One');
        expect(fetchedUser?.email).toBe('user-one@example.com');
        expect(fetchedUser?.teamName).toBe('Team One');
        expect(fetchedUser?.logoUrl).toBe('https://example.com/team-one.png');
        expect(fetchedUser?.reachedPlayoff).toBe(false);
        expect(fetchedUser?.isFirstRoundDraftOrderDraw).toBe(false);
        expect(fetchedUser?.bio).toBe('User one bio');
        expect(fetchedUser?.cabinetTrophy).toEqual([]);
        expect(fetchedUser?.isAdmin).toBe(false);
    });
});
