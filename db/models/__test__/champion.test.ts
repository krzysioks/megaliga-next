import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import ChampionModel, { PopulatedFindType } from '@/db/models/champion';
import LigueGroupsModel from '@/db/models/ligue-groups';
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
    await LigueGroupsModel.deleteMany();
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
        const group = await new LigueGroupsModel({
            groupName: 'dolce'
        }).save();

        const user = await new UserModel(
            createUserData({
                groupName: group._id.toString()
            })
        ).save();
        const userId = user._id.toString();

        await new ChampionModel({ userId }).save();

        const result: PopulatedFindType | null =
            await ChampionModel.getChampion();

        expect(result).not.toBeNull();
        expect(result?._id.toString()).toEqual(userId);
        expect(result?.username).toEqual(user.username);
        expect(result?.coachName).toEqual(user.coachName);
        expect(result?.email).toEqual(user.email);
        expect(result?.teamName).toEqual(user.teamName);
        expect(result?.logoUrl).toEqual(user.logoUrl);
        expect(result?.reachedPlayoff).toEqual(user.reachedPlayoff);
        expect(result?.isFirstRoundDraftOrderDraw).toEqual(
            user.isFirstRoundDraftOrderDraw
        );
        expect(result?.groupName?.groupName).toBe('dolce');
        expect(result?.bio).toEqual(user.bio);
        expect(result?.cabinetTrophy).toEqual(user.cabinetTrophy);
        expect(result?.isAdmin).toEqual(user.isAdmin);
    });

    test('Should create new champion document when none exists', async () => {
        const user = await new UserModel(createUserData()).save();
        const userId = user._id.toString();

        await ChampionModel.setChampion(userId);

        const result = await ChampionModel.getChampion();
        expect(result).not.toBeNull();
        expect(result?._id.toString()).toEqual(userId);
    });

    test('Should update existing champion document', async () => {
        const user1 = await new UserModel(
            createUserData({ username: 'user-one' })
        ).save();
        const user2 = await new UserModel(
            createUserData({
                username: 'user-two',
                email: 'user-two@example.com'
            })
        ).save();

        // Create initial champion
        await ChampionModel.setChampion(user1._id.toString());

        // Update champion to user2
        await ChampionModel.setChampion(user2._id.toString());

        const result = await ChampionModel.getChampion();
        expect(result?._id.toString()).toEqual(user2._id.toString());
        expect(result?.username).toEqual(user2.username);

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
