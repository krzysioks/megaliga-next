import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import ChampionModel, { ChampionDtoType } from '@/db/models/champion';
import UserModel, { UserType } from '@/db/models/user';

// connect to test db before running tests
beforeAll(async () => {
    // Mock console.error to silence logs during testing
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test tear down clear database
beforeEach(async () => {
    await ChampionModel.deleteMany();
    await UserModel.deleteMany();
});

//close connection to server so, that test suite will close
afterAll(async () => {
    await ChampionModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test ChampionModel methods and static functions', () => {
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

    test('Should get current champion data', async () => {
        const user = await new UserModel(createUserData()).save();
        const userId = user._id.toString();

        await new ChampionModel({ userId }).save();

        const result: ChampionDtoType = await ChampionModel.getChampion();

        expect(result).not.toBeNull();
        expect(result.teamName).toEqual(user.teamName);
        expect(result.logoUrl).toEqual(user.logoUrl);
    });

    test('Should create new champion document when none exists', async () => {
        const user = await new UserModel(createUserData()).save();
        const userId = user._id.toString();

        await ChampionModel.setChampion(userId);

        const result = await ChampionModel.getChampion();
        expect(result).not.toBeNull();
        expect(result.teamName).toEqual(user.teamName);
        expect(result.logoUrl).toEqual(user.logoUrl);
    });

    test('Should update existing champion document', async () => {
        const user1 = await new UserModel(
            createUserData({ username: 'user-one' })
        ).save();
        const user2 = await new UserModel(
            createUserData({
                username: 'user-two',
                email: 'user-two@example.com',
                teamName: 'Team Two',
                logoUrl: 'https://example.com/team-two.png'
            })
        ).save();

        // Create initial champion
        await ChampionModel.setChampion(user1._id.toString());

        // Update champion to user2
        await ChampionModel.setChampion(user2._id.toString());

        const result = await ChampionModel.getChampion();
        expect(result.teamName).toEqual(user2.teamName);
        expect(result.logoUrl).toEqual(user2.logoUrl);

        // Verify only one document exists
        const count = await ChampionModel.countDocuments();
        expect(count).toBe(1);
    });

    test('Should reject non-existent userId in setChampion', async () => {
        const fakeUserId = new mongoose.Types.ObjectId().toString();
        await expect(ChampionModel.setChampion(fakeUserId)).rejects.toThrow(
            `Invalid userId: ${fakeUserId}`
        );
    });
});
