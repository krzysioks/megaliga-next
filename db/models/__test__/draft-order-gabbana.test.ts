import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import DraftOrderGabbanaModel, {
    DraftOrderDtoType
} from '@/db/models/draft/draft-order-gabbana';
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

    it('Should get whole draft order for 6 users in expected order', async () => {
        const users = await UserModel.create([
            createUserData({
                username: 'gabbana-user-1',
                email: 'gabbana-user-1@example.com',
                teamName: 'Team 1'
            }),
            createUserData({
                username: 'gabbana-user-2',
                email: 'gabbana-user-2@example.com',
                teamName: 'Team 2'
            }),
            createUserData({
                username: 'gabbana-user-3',
                email: 'gabbana-user-3@example.com',
                teamName: 'Team 3'
            }),
            createUserData({
                username: 'gabbana-user-4',
                email: 'gabbana-user-4@example.com',
                teamName: 'Team 4'
            }),
            createUserData({
                username: 'gabbana-user-5',
                email: 'gabbana-user-5@example.com',
                teamName: 'Team 5'
            }),
            createUserData({
                username: 'gabbana-user-6',
                email: 'gabbana-user-6@example.com',
                teamName: 'Team 6'
            })
        ]);

        const randomizedDraftEntries = [
            { userId: users[0]._id.toString(), draftOrder: 4 },
            { userId: users[1]._id.toString(), draftOrder: 1 },
            { userId: users[2]._id.toString(), draftOrder: 6 },
            { userId: users[3]._id.toString(), draftOrder: 2 },
            { userId: users[4]._id.toString(), draftOrder: 5 },
            { userId: users[5]._id.toString(), draftOrder: 3 }
        ];

        await DraftOrderGabbanaModel.create(randomizedDraftEntries);

        const draftOrder: DraftOrderDtoType[] =
            await DraftOrderGabbanaModel.getDraftOrder();

        expect(draftOrder).toHaveLength(6);
        expect(draftOrder.map(item => item.draftOrder)).toEqual([
            1, 2, 3, 4, 5, 6
        ]);

        const expectedTeamByOrder: Record<number, string> = {
            1: users[1].teamName,
            2: users[3].teamName,
            3: users[5].teamName,
            4: users[0].teamName,
            5: users[4].teamName,
            6: users[2].teamName
        };

        draftOrder.forEach(item => {
            expect(item.teamName).toBe(expectedTeamByOrder[item.draftOrder]);
        });
    });
});
