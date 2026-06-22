import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import ScheduleModel, {
    ScheduleWithUserPopulatedType,
    ScheduleType
} from '@/db/models/games/schedule';
import LigueGroupsModel from '@/db/models/ligue-groups';
import UserModel from '@/db/models/user';

let dolceId: string;
let gabbanaId: string;
let usersToCreate: Record<string, string>[];
let scheduleData: ScheduleType[];

// connect to test db before running tests
beforeAll(async () => {
    // Mock console.error to silence logs during testing
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();

    await ScheduleModel.deleteMany();
    await UserModel.deleteMany();
    await LigueGroupsModel.deleteMany();

    const dolceGroup = await new LigueGroupsModel({
        groupName: 'dolce'
    }).save();

    const gabbanaGroup = await new LigueGroupsModel({
        groupName: 'gabbana'
    }).save();

    dolceId = dolceGroup._id.toString();
    gabbanaId = gabbanaGroup._id.toString();

    const baseUserData = {
        password: 'Password1!',
        coachName: 'Coach One',
        logoUrl: 'https://example.com/team-one.png',
        reachedPlayoff: false,
        isFirstRoundDraftOrderDraw: false,
        bio: 'User one bio',
        cabinetTrophy: [],
        isAdmin: false
    };

    usersToCreate = [
        {
            username: 'user-one',
            teamName: 'Team One',
            email: 'user-one@example.com',
            groupName: dolceId
        },
        {
            username: 'user-two',
            teamName: 'Team Two',
            email: 'user-two@example.com',
            groupName: dolceId
        },
        {
            username: 'user-three',
            teamName: 'Team Three',
            email: 'user-three@example.com',
            groupName: dolceId
        },
        {
            username: 'user-four',
            teamName: 'Team Four',
            email: 'user-four@example.com',
            groupName: dolceId
        },
        {
            username: 'user-five',
            teamName: 'Team Five',
            email: 'user-five@example.com',
            groupName: gabbanaId
        },
        {
            username: 'user-six',
            teamName: 'Team Six',
            email: 'user-six@example.com',
            groupName: gabbanaId
        },
        {
            username: 'user-seven',
            teamName: 'Team Seven',
            email: 'user-seven@example.com',
            groupName: gabbanaId
        },
        {
            username: 'user-eight',
            teamName: 'Team Eight',
            email: 'user-eight@example.com',
            groupName: gabbanaId
        }
    ];

    const createdUsers = await UserModel.create(
        usersToCreate.map(user => ({
            ...baseUserData,
            ...user
        }))
    );

    scheduleData = [
        {
            roundNumber: 1,
            ligueGroupsId: dolceId,
            userOneId: createdUsers[0]._id.toString(),
            userTwoId: createdUsers[1]._id.toString(),
            userOneScore: 20,
            userTwoScore: 16
        },
        {
            roundNumber: 1,
            ligueGroupsId: dolceId,
            userOneId: createdUsers[2]._id.toString(),
            userTwoId: createdUsers[3]._id.toString(),
            userOneScore: 18,
            userTwoScore: 22
        },
        {
            roundNumber: 2,
            ligueGroupsId: dolceId,
            userOneId: createdUsers[0]._id.toString(),
            userTwoId: createdUsers[2]._id.toString(),
            userOneScore: 40,
            userTwoScore: 36
        },
        {
            roundNumber: 2,
            ligueGroupsId: dolceId,
            userOneId: createdUsers[3]._id.toString(),
            userTwoId: createdUsers[1]._id.toString(),
            userOneScore: 38,
            userTwoScore: 52
        },
        {
            roundNumber: 1,
            ligueGroupsId: gabbanaId,
            userOneId: createdUsers[4]._id.toString(),
            userTwoId: createdUsers[5]._id.toString(),
            userOneScore: 25,
            userTwoScore: 30
        },
        {
            roundNumber: 1,
            ligueGroupsId: gabbanaId,
            userOneId: createdUsers[6]._id.toString(),
            userTwoId: createdUsers[7]._id.toString(),
            userOneScore: 28,
            userTwoScore: 24
        },
        {
            roundNumber: 2,
            ligueGroupsId: gabbanaId,
            userOneId: createdUsers[4]._id.toString(),
            userTwoId: createdUsers[6]._id.toString(),
            userOneScore: 50,
            userTwoScore: 45
        },
        {
            roundNumber: 2,
            ligueGroupsId: gabbanaId,
            userOneId: createdUsers[7]._id.toString(),
            userTwoId: createdUsers[5]._id.toString(),
            userOneScore: 42,
            userTwoScore: 48
        }
    ];

    await ScheduleModel.create(scheduleData);
});

//close connection to server so, that test suite will close
afterAll(async () => {
    await ScheduleModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test ScheduleModel methods and static functions', () => {
    const getExpectedSchedules = (roundNumber: number, ligueGroupId: string) =>
        scheduleData.filter(schedule => {
            return (
                schedule.roundNumber === roundNumber &&
                schedule.ligueGroupsId === ligueGroupId
            );
        });

    const findFetchedSchedule = (
        fetchedSchedules: ScheduleWithUserPopulatedType[],
        expectedSchedule: ScheduleType
    ) =>
        fetchedSchedules.find(schedule => {
            return (
                schedule.userOneId._id.toString() ===
                    expectedSchedule.userOneId &&
                schedule.userTwoId._id.toString() === expectedSchedule.userTwoId
            );
        });

    test('Should get schedule for round 1 and dolce group', async () => {
        const round1DolceSchedules = await ScheduleModel.getScheduleByRound(
            1,
            dolceId
        );
        const expectedRound1DolceSchedules = getExpectedSchedules(1, dolceId);

        expect(round1DolceSchedules).toHaveLength(2);
        expect(expectedRound1DolceSchedules).toHaveLength(2);

        const schedule = findFetchedSchedule(
            round1DolceSchedules,
            expectedRound1DolceSchedules[0]
        );
        expect(schedule).toBeDefined();

        expect(schedule?.roundNumber).toBe(
            expectedRound1DolceSchedules[0].roundNumber
        );
        expect(schedule?.ligueGroupsId?.toString()).toBe(
            expectedRound1DolceSchedules[0].ligueGroupsId
        );
        expect(schedule?.userOneScore).toBe(
            expectedRound1DolceSchedules[0].userOneScore
        );
        expect(schedule?.userTwoScore).toBe(
            expectedRound1DolceSchedules[0].userTwoScore
        );

        // assert populated userOneId and userTwoId
        expect(schedule?.userOneId).toBeDefined();
        expect(schedule?.userOneId?.username).toBe(usersToCreate[0].username);
        expect(schedule?.userOneId?.teamName).toBe(usersToCreate[0].teamName);
        expect(schedule?.userOneId?.email).toBe(usersToCreate[0].email);
        expect(schedule?.userOneId?.groupName?.toString()).toBe(dolceId);

        expect(schedule?.userTwoId).toBeDefined();
        expect(schedule?.userTwoId?.username).toBe(usersToCreate[1].username);
        expect(schedule?.userTwoId?.teamName).toBe(usersToCreate[1].teamName);
        expect(schedule?.userTwoId?.email).toBe(usersToCreate[1].email);
        expect(schedule?.userTwoId?.groupName?.toString()).toBe(dolceId);

        const schedule2 = findFetchedSchedule(
            round1DolceSchedules,
            expectedRound1DolceSchedules[1]
        );
        expect(schedule2).toBeDefined();

        expect(schedule2?.roundNumber).toBe(
            expectedRound1DolceSchedules[1].roundNumber
        );
        expect(schedule2?.ligueGroupsId?.toString()).toBe(
            expectedRound1DolceSchedules[1].ligueGroupsId
        );
        expect(schedule2?.userOneScore).toBe(
            expectedRound1DolceSchedules[1].userOneScore
        );
        expect(schedule2?.userTwoScore).toBe(
            expectedRound1DolceSchedules[1].userTwoScore
        );

        // assert populated userOneId and userTwoId
        expect(schedule2?.userOneId).toBeDefined();
        expect(schedule2?.userOneId?.username).toBe(usersToCreate[2].username);
        expect(schedule2?.userOneId?.teamName).toBe(usersToCreate[2].teamName);
        expect(schedule2?.userOneId?.email).toBe(usersToCreate[2].email);
        expect(schedule2?.userOneId?.groupName?.toString()).toBe(dolceId);

        expect(schedule2?.userTwoId).toBeDefined();
        expect(schedule2?.userTwoId?.username).toBe(usersToCreate[3].username);
        expect(schedule2?.userTwoId?.teamName).toBe(usersToCreate[3].teamName);
        expect(schedule2?.userTwoId?.email).toBe(usersToCreate[3].email);
        expect(schedule2?.userTwoId?.groupName?.toString()).toBe(dolceId);
    });

    test('Should get schedule for round 2 and dolce group', async () => {
        const round2DolceSchedules = await ScheduleModel.getScheduleByRound(
            2,
            dolceId
        );
        const expectedRound2DolceSchedules = getExpectedSchedules(2, dolceId);

        expect(round2DolceSchedules).toHaveLength(2);
        expect(expectedRound2DolceSchedules).toHaveLength(2);

        const schedule = findFetchedSchedule(
            round2DolceSchedules,
            expectedRound2DolceSchedules[0]
        );
        expect(schedule).toBeDefined();

        expect(schedule?.roundNumber).toBe(
            expectedRound2DolceSchedules[0].roundNumber
        );
        expect(schedule?.ligueGroupsId?.toString()).toBe(
            expectedRound2DolceSchedules[0].ligueGroupsId
        );
        expect(schedule?.userOneScore).toBe(
            expectedRound2DolceSchedules[0].userOneScore
        );
        expect(schedule?.userTwoScore).toBe(
            expectedRound2DolceSchedules[0].userTwoScore
        );

        // assert populated userOneId and userTwoId
        expect(schedule?.userOneId).toBeDefined();
        expect(schedule?.userOneId?.username).toBe(usersToCreate[0].username);
        expect(schedule?.userOneId?.teamName).toBe(usersToCreate[0].teamName);
        expect(schedule?.userOneId?.email).toBe(usersToCreate[0].email);
        expect(schedule?.userOneId?.groupName?.toString()).toBe(dolceId);

        expect(schedule?.userTwoId).toBeDefined();
        expect(schedule?.userTwoId?.username).toBe(usersToCreate[2].username);
        expect(schedule?.userTwoId?.teamName).toBe(usersToCreate[2].teamName);
        expect(schedule?.userTwoId?.email).toBe(usersToCreate[2].email);
        expect(schedule?.userTwoId?.groupName?.toString()).toBe(dolceId);

        const schedule2 = findFetchedSchedule(
            round2DolceSchedules,
            expectedRound2DolceSchedules[1]
        );
        expect(schedule2).toBeDefined();

        expect(schedule2?.roundNumber).toBe(
            expectedRound2DolceSchedules[1].roundNumber
        );
        expect(schedule2?.ligueGroupsId?.toString()).toBe(
            expectedRound2DolceSchedules[1].ligueGroupsId
        );
        expect(schedule2?.userOneScore).toBe(
            expectedRound2DolceSchedules[1].userOneScore
        );
        expect(schedule2?.userTwoScore).toBe(
            expectedRound2DolceSchedules[1].userTwoScore
        );

        expect(schedule2?.userOneId).toBeDefined();
        expect(schedule2?.userOneId?.username).toBe(usersToCreate[3].username);
        expect(schedule2?.userOneId?.teamName).toBe(usersToCreate[3].teamName);
        expect(schedule2?.userOneId?.email).toBe(usersToCreate[3].email);
        expect(schedule2?.userOneId?.groupName?.toString()).toBe(dolceId);

        expect(schedule2?.userTwoId).toBeDefined();
        expect(schedule2?.userTwoId?.username).toBe(usersToCreate[1].username);
        expect(schedule2?.userTwoId?.teamName).toBe(usersToCreate[1].teamName);
        expect(schedule2?.userTwoId?.email).toBe(usersToCreate[1].email);
        expect(schedule2?.userTwoId?.groupName?.toString()).toBe(dolceId);
    });

    test('Should get schedule for round 1 and dolce', async () => {
        const round1DolceSchedules = await ScheduleModel.getScheduleByRound(
            1,
            dolceId
        );
        const round2DolceSchedules = await ScheduleModel.getScheduleByRound(
            2,
            dolceId
        );

        const round1GabbanaSchedules = await ScheduleModel.getScheduleByRound(
            1,
            gabbanaId
        );
        const round2GabbanaSchedules = await ScheduleModel.getScheduleByRound(
            2,
            gabbanaId
        );

        expect(round1DolceSchedules).toHaveLength(2);
        expect(round2DolceSchedules).toHaveLength(2);
        expect(round1GabbanaSchedules).toHaveLength(2);
        expect(round2GabbanaSchedules).toHaveLength(2);
    });

    test('Should get schedule for round 1 and gabbana group', async () => {
        const round1GabbanaSchedules = await ScheduleModel.getScheduleByRound(
            1,
            gabbanaId
        );
        const expectedRound1GabbanaSchedules = getExpectedSchedules(
            1,
            gabbanaId
        );

        expect(round1GabbanaSchedules).toHaveLength(2);
        expect(expectedRound1GabbanaSchedules).toHaveLength(2);

        const schedule = findFetchedSchedule(
            round1GabbanaSchedules,
            expectedRound1GabbanaSchedules[0]
        );
        expect(schedule).toBeDefined();

        expect(schedule?.roundNumber).toBe(
            expectedRound1GabbanaSchedules[0].roundNumber
        );
        expect(schedule?.ligueGroupsId?.toString()).toBe(
            expectedRound1GabbanaSchedules[0].ligueGroupsId
        );
        expect(schedule?.userOneScore).toBe(
            expectedRound1GabbanaSchedules[0].userOneScore
        );
        expect(schedule?.userTwoScore).toBe(
            expectedRound1GabbanaSchedules[0].userTwoScore
        );

        // assert populated userOneId and userTwoId
        expect(schedule?.userOneId).toBeDefined();
        expect(schedule?.userOneId?.username).toBe(usersToCreate[4].username);
        expect(schedule?.userOneId?.teamName).toBe(usersToCreate[4].teamName);
        expect(schedule?.userOneId?.email).toBe(usersToCreate[4].email);
        expect(schedule?.userOneId?.groupName?.toString()).toBe(gabbanaId);

        expect(schedule?.userTwoId).toBeDefined();
        expect(schedule?.userTwoId?.username).toBe(usersToCreate[5].username);
        expect(schedule?.userTwoId?.teamName).toBe(usersToCreate[5].teamName);
        expect(schedule?.userTwoId?.email).toBe(usersToCreate[5].email);
        expect(schedule?.userTwoId?.groupName?.toString()).toBe(gabbanaId);

        const schedule2 = findFetchedSchedule(
            round1GabbanaSchedules,
            expectedRound1GabbanaSchedules[1]
        );
        expect(schedule2).toBeDefined();

        expect(schedule2?.roundNumber).toBe(
            expectedRound1GabbanaSchedules[1].roundNumber
        );
        expect(schedule2?.ligueGroupsId?.toString()).toBe(
            expectedRound1GabbanaSchedules[1].ligueGroupsId
        );
        expect(schedule2?.userOneScore).toBe(
            expectedRound1GabbanaSchedules[1].userOneScore
        );
        expect(schedule2?.userTwoScore).toBe(
            expectedRound1GabbanaSchedules[1].userTwoScore
        );

        // assert populated userOneId and userTwoId
        expect(schedule2?.userOneId).toBeDefined();
        expect(schedule2?.userOneId?.username).toBe(usersToCreate[6].username);
        expect(schedule2?.userOneId?.teamName).toBe(usersToCreate[6].teamName);
        expect(schedule2?.userOneId?.email).toBe(usersToCreate[6].email);
        expect(schedule2?.userOneId?.groupName?.toString()).toBe(gabbanaId);

        expect(schedule2?.userTwoId).toBeDefined();
        expect(schedule2?.userTwoId?.username).toBe(usersToCreate[7].username);
        expect(schedule2?.userTwoId?.teamName).toBe(usersToCreate[7].teamName);
        expect(schedule2?.userTwoId?.email).toBe(usersToCreate[7].email);
        expect(schedule2?.userTwoId?.groupName?.toString()).toBe(gabbanaId);
    });

    test('Should get schedule for round 2 and gabbana group', async () => {
        const round2GabbanaSchedules = await ScheduleModel.getScheduleByRound(
            2,
            gabbanaId
        );
        const expectedRound2GabbanaSchedules = getExpectedSchedules(
            2,
            gabbanaId
        );

        expect(round2GabbanaSchedules).toHaveLength(2);
        expect(expectedRound2GabbanaSchedules).toHaveLength(2);

        const schedule = findFetchedSchedule(
            round2GabbanaSchedules,
            expectedRound2GabbanaSchedules[0]
        );
        expect(schedule).toBeDefined();

        expect(schedule?.roundNumber).toBe(
            expectedRound2GabbanaSchedules[0].roundNumber
        );
        expect(schedule?.ligueGroupsId?.toString()).toBe(
            expectedRound2GabbanaSchedules[0].ligueGroupsId
        );
        expect(schedule?.userOneScore).toBe(
            expectedRound2GabbanaSchedules[0].userOneScore
        );
        expect(schedule?.userTwoScore).toBe(
            expectedRound2GabbanaSchedules[0].userTwoScore
        );

        // assert populated userOneId and userTwoId
        expect(schedule?.userOneId).toBeDefined();
        expect(schedule?.userOneId?.username).toBe(usersToCreate[4].username);
        expect(schedule?.userOneId?.teamName).toBe(usersToCreate[4].teamName);
        expect(schedule?.userOneId?.email).toBe(usersToCreate[4].email);
        expect(schedule?.userOneId?.groupName?.toString()).toBe(gabbanaId);

        expect(schedule?.userTwoId).toBeDefined();
        expect(schedule?.userTwoId?.username).toBe(usersToCreate[6].username);
        expect(schedule?.userTwoId?.teamName).toBe(usersToCreate[6].teamName);
        expect(schedule?.userTwoId?.email).toBe(usersToCreate[6].email);
        expect(schedule?.userTwoId?.groupName?.toString()).toBe(gabbanaId);

        const schedule2 = findFetchedSchedule(
            round2GabbanaSchedules,
            expectedRound2GabbanaSchedules[1]
        );
        expect(schedule2).toBeDefined();

        expect(schedule2?.roundNumber).toBe(
            expectedRound2GabbanaSchedules[1].roundNumber
        );
        expect(schedule2?.ligueGroupsId?.toString()).toBe(
            expectedRound2GabbanaSchedules[1].ligueGroupsId
        );
        expect(schedule2?.userOneScore).toBe(
            expectedRound2GabbanaSchedules[1].userOneScore
        );
        expect(schedule2?.userTwoScore).toBe(
            expectedRound2GabbanaSchedules[1].userTwoScore
        );

        expect(schedule2?.userOneId).toBeDefined();
        expect(schedule2?.userOneId?.username).toBe(usersToCreate[7].username);
        expect(schedule2?.userOneId?.teamName).toBe(usersToCreate[7].teamName);
        expect(schedule2?.userOneId?.email).toBe(usersToCreate[7].email);
        expect(schedule2?.userOneId?.groupName?.toString()).toBe(gabbanaId);

        expect(schedule2?.userTwoId).toBeDefined();
        expect(schedule2?.userTwoId?.username).toBe(usersToCreate[5].username);
        expect(schedule2?.userTwoId?.teamName).toBe(usersToCreate[5].teamName);
        expect(schedule2?.userTwoId?.email).toBe(usersToCreate[5].email);
        expect(schedule2?.userTwoId?.groupName?.toString()).toBe(gabbanaId);
    });

    test('Should throw error when wrong ligueGroupsId is provided', async () => {
        const wrongLigueGroupsId = new mongoose.Types.ObjectId().toString();

        await expect(
            ScheduleModel.getScheduleByRound(1, wrongLigueGroupsId)
        ).rejects.toThrow(`Invalid ligueGroupsId: ${wrongLigueGroupsId}`);
    });

    test('Should throw error when roundNumber does not exist for existing ligueGroupsId', async () => {
        await expect(
            ScheduleModel.getScheduleByRound(99, dolceId)
        ).rejects.toThrow(
            `Schedules for given ligueGroupsId: ${dolceId} and roundNumber: 99 don't exist: `
        );
    });
});
