import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import DraftOrderGabbanaModel from '@/db/models/draft/draft-order-gabbana';
import UserModel, { UserType } from '@/db/models/user';

const createUserData = (overrides: Partial<UserType> = {}) => ({
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
    isAdmin: false,
    ...overrides
});

// connect to test db before running tests
beforeAll(async () => {
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test clear collections
beforeEach(async () => {
    await DraftOrderGabbanaModel.deleteMany();
    await UserModel.deleteMany();
});

// close connection to server so that test suite will close
afterAll(async () => {
    await DraftOrderGabbanaModel.deleteMany();
    await UserModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test DraftOrderGabbanaModel methods and static functions', () => {
    it('Should get proper userId for given roundNumber', async () => {
        const userOne = await new UserModel(
            createUserData({
                username: 'gabbana-user-one',
                email: 'gabbana-user-one@example.com'
            })
        ).save();
        const userTwo = await new UserModel(
            createUserData({
                username: 'gabbana-user-two',
                email: 'gabbana-user-two@example.com'
            })
        ).save();

        await DraftOrderGabbanaModel.create([
            { userId: userOne._id.toString(), draftOrder: 1 },
            { userId: userTwo._id.toString(), draftOrder: 2 }
        ]);

        const roundOneUserId =
            await DraftOrderGabbanaModel.getCurrentDraftOrderUserIdByRound(1);
        const roundTwoUserId =
            await DraftOrderGabbanaModel.getCurrentDraftOrderUserIdByRound(2);

        expect(roundOneUserId?.toString()).toBe(userOne._id.toString());
        expect(roundTwoUserId?.toString()).toBe(userTwo._id.toString());
    });
});
