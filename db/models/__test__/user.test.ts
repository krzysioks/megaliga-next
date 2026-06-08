import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import { LigueGroupsModel } from '@/db/models/ligue-groups';
import UserModel, { FindByIdType } from '@/db/models/user';

// connect to test db before running tests
beforeAll(async () => {
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test tear down clear database
beforeEach(async () => {
    await UserModel.deleteMany();
    await LigueGroupsModel.deleteMany();
});

//close connection to server so, that test suite will close
afterAll(async () => {
    await UserModel.deleteMany();
    await LigueGroupsModel.deleteMany();
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
    test('Should call getNumberOfUsersAssignedToGroup and return proper number of users assigned to given ligue group', async () => {
        const dolceGroup = await new LigueGroupsModel({
            groupName: 'dolce'
        }).save();

        const gabbanaGroup = await new LigueGroupsModel({
            groupName: 'gabbana'
        }).save();
        const notDrawnGroup = await new LigueGroupsModel({
            groupName: 'nie wylosowano'
        }).save();
        const dolceId = dolceGroup._id.toString();
        const gabbanaId = gabbanaGroup._id.toString();
        const notDrawnId = notDrawnGroup._id.toString();

        const baseUserData = {
            password: 'Password1!',
            teamName: 'Team One',
            logoUrl: 'https://example.com/team-one.png',
            reachedPlayoff: false,
            isFirstRoundDraftOrderDraw: false,
            bio: 'User one bio',
            cabinetTrophy: [],
            isAdmin: false
        };

        const usersToCreate = [
            {
                username: 'user-one',
                coachName: 'Coach One',
                email: 'user-one@example.com',
                groupName: dolceId
            },
            {
                username: 'user-two',
                coachName: 'Coach Two',
                email: 'user-two@example.com',
                groupName: dolceId
            },
            {
                username: 'user-three',
                coachName: 'Coach Three',
                email: 'user-three@example.com',
                groupName: dolceId
            },
            {
                username: 'user-four',
                coachName: 'Coach Four',
                email: 'user-four@example.com',
                groupName: gabbanaId
            },
            {
                username: 'user-five',
                coachName: 'Coach Five',
                email: 'user-five@example.com',
                groupName: gabbanaId
            },
            {
                username: 'user-six',
                coachName: 'Coach Six',
                email: 'user-six@example.com',
                groupName: notDrawnId
            },
            {
                username: 'user-seven',
                coachName: 'Coach Seven',
                email: 'user-seven@example.com',
                groupName: notDrawnId
            }
        ];

        await UserModel.create(
            usersToCreate.map(user => ({
                ...baseUserData,
                ...user
            }))
        );
        const countDolce =
            await UserModel.getNumberOfUsersAssignedToGroup(dolceId);
        const countGabbana =
            await UserModel.getNumberOfUsersAssignedToGroup(gabbanaId);

        expect(countDolce).toBe(3);
        expect(countGabbana).toBe(2);
    });
    test('Should call getNumberOfUsersAssignedToGroup and return 0 if none of the user is assigned to given ligue group', async () => {
        const dolceGroup = await new LigueGroupsModel({
            groupName: 'dolce'
        }).save();

        const gabbanaGroup = await new LigueGroupsModel({
            groupName: 'gabbana'
        }).save();
        const notDrawnGroup = await new LigueGroupsModel({
            groupName: 'nie wylosowano'
        }).save();
        const dolceId = dolceGroup._id.toString();
        const gabbanaId = gabbanaGroup._id.toString();
        const notDrawnId = notDrawnGroup._id.toString();

        const baseUserData = {
            password: 'Password1!',
            teamName: 'Team One',
            logoUrl: 'https://example.com/team-one.png',
            reachedPlayoff: false,
            isFirstRoundDraftOrderDraw: false,
            bio: 'User one bio',
            cabinetTrophy: [],
            isAdmin: false
        };

        const usersToCreate = [
            {
                username: 'user-six',
                coachName: 'Coach Six',
                email: 'user-six@example.com',
                groupName: notDrawnId
            },
            {
                username: 'user-seven',
                coachName: 'Coach Seven',
                email: 'user-seven@example.com',
                groupName: notDrawnId
            }
        ];

        await UserModel.create(
            usersToCreate.map(user => ({
                ...baseUserData,
                ...user
            }))
        );
        const countDolce =
            await UserModel.getNumberOfUsersAssignedToGroup(dolceId);
        const countGabbana =
            await UserModel.getNumberOfUsersAssignedToGroup(gabbanaId);

        expect(countDolce).toBe(0);
        expect(countGabbana).toBe(0);
    });
});
