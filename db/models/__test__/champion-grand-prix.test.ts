import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import ChampionGrandPrixModel, {
    ChampionGrandPrixDtoType
} from '@/db/models/champion-grand-prix';
import UserModel, { UserType } from '@/db/models/user';

// connect to test db before running tests
beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test tear down clear database
beforeEach(async () => {
    await ChampionGrandPrixModel.deleteMany();
    await UserModel.deleteMany();
});

//close connection to server so, that test suite will close
afterAll(async () => {
    await ChampionGrandPrixModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test ChampionGrandPrixModel methods and static functions', () => {
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

    test('Should get current grand prix champion data', async () => {
        const user = await new UserModel(createUserData()).save();
        const userId = user._id.toString();

        await new ChampionGrandPrixModel({ userId }).save();

        const result: ChampionGrandPrixDtoType =
            await ChampionGrandPrixModel.getChampion();

        expect(result).not.toBeNull();
        expect(result.coachName).toEqual(user.coachName);
    });

    test('Should create new grand prix champion document when none exists', async () => {
        const user = await new UserModel(createUserData()).save();
        const userId = user._id.toString();

        await ChampionGrandPrixModel.setChampion(userId);

        const result = await ChampionGrandPrixModel.getChampion();
        expect(result).not.toBeNull();
        expect(result.coachName).toEqual(user.coachName);
    });

    test('Should update existing grand prix champion document', async () => {
        const user1 = await new UserModel(
            createUserData({ username: 'user-one' })
        ).save();
        const user2 = await new UserModel(
            createUserData({
                username: 'user-two',
                email: 'user-two@example.com',
                coachName: 'Coach Two'
            })
        ).save();

        // Create initial champion
        await ChampionGrandPrixModel.setChampion(user1._id.toString());

        // Update champion to user2
        await ChampionGrandPrixModel.setChampion(user2._id.toString());

        const result = await ChampionGrandPrixModel.getChampion();
        expect(result.coachName).toEqual(user2.coachName);

        // Verify only one document exists
        const count = await ChampionGrandPrixModel.countDocuments();
        expect(count).toBe(1);
    });

    test('Should reject non-existent userId in setChampion', async () => {
        const fakeUserId = new mongoose.Types.ObjectId().toString();
        await expect(
            ChampionGrandPrixModel.setChampion(fakeUserId)
        ).rejects.toThrow(`Invalid userId: ${fakeUserId}`);
    });
});
