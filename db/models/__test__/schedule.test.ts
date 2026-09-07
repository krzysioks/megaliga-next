import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import ScheduleModel, {
    ScheduleByRoundDtoType,
    ScheduleType
} from '@/db/models/games/schedule';
import LigueGroupsModel from '@/db/models/ligue-groups';
import UserModel from '@/db/models/user';

let dolceId: string;
let gabbanaId: string;
let usersToCreate: Record<string, string>[];
let scheduleData: ScheduleType[];
let createdSchedules: Awaited<ReturnType<typeof ScheduleModel.create>>;

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
            coachName: 'Coach One',
            logoUrl: 'https://example.com/team-one.png',
            email: 'user-one@example.com',
            groupName: dolceId
        },
        {
            username: 'user-two',
            teamName: 'Team Two',
            coachName: 'Coach Two',
            logoUrl: 'https://example.com/team-two.png',
            email: 'user-two@example.com',
            groupName: dolceId
        },
        {
            username: 'user-three',
            teamName: 'Team Three',
            coachName: 'Coach Three',
            logoUrl: 'https://example.com/team-three.png',
            email: 'user-three@example.com',
            groupName: dolceId
        },
        {
            username: 'user-four',
            teamName: 'Team Four',
            coachName: 'Coach Four',
            logoUrl: 'https://example.com/team-four.png',
            email: 'user-four@example.com',
            groupName: dolceId
        },
        {
            username: 'user-five',
            teamName: 'Team Five',
            coachName: 'Coach Five',
            logoUrl: 'https://example.com/team-five.png',
            email: 'user-five@example.com',
            groupName: gabbanaId
        },
        {
            username: 'user-six',
            teamName: 'Team Six',
            coachName: 'Coach Six',
            logoUrl: 'https://example.com/team-six.png',
            email: 'user-six@example.com',
            groupName: gabbanaId
        },
        {
            username: 'user-seven',
            teamName: 'Team Seven',
            coachName: 'Coach Seven',
            logoUrl: 'https://example.com/team-seven.png',
            email: 'user-seven@example.com',
            groupName: gabbanaId
        },
        {
            username: 'user-eight',
            teamName: 'Team Eight',
            coachName: 'Coach Eight',
            logoUrl: 'https://example.com/team-eight.png',
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

    usersToCreate = usersToCreate.map((user, index) => ({
        ...user,
        _id: createdUsers[index]._id.toString()
    }));

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

    createdSchedules = await ScheduleModel.create(scheduleData);
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
        fetchedSchedules: ScheduleByRoundDtoType[],
        expectedSchedule: ScheduleType
    ) =>
        fetchedSchedules.find(schedule => {
            const expectedUserOne = findSeededUser(
                expectedSchedule.userOneId ?? ''
            );
            const expectedUserTwo = findSeededUser(
                expectedSchedule.userTwoId ?? ''
            );

            return (
                schedule.userOne.teamName === expectedUserOne?.teamName &&
                schedule.userOne.logoUrl === expectedUserOne?.logoUrl &&
                schedule.userTwo.teamName === expectedUserTwo?.teamName &&
                schedule.userTwo.logoUrl === expectedUserTwo?.logoUrl
            );
        });

    const findSeededUser = (userId: string) =>
        usersToCreate.find(user => user._id?.toString() === userId);

    const assertFetchedSchedule = (
        fetchedSchedule: ScheduleByRoundDtoType | undefined,
        expectedSchedule: ScheduleType
    ) => {
        expect(fetchedSchedule).toBeDefined();

        const expectedUserOne = findSeededUser(
            expectedSchedule.userOneId ?? ''
        );
        const expectedUserTwo = findSeededUser(
            expectedSchedule.userTwoId ?? ''
        );

        expect(expectedUserOne).toBeDefined();
        expect(expectedUserTwo).toBeDefined();

        expect(fetchedSchedule?.roundNumber).toBe(expectedSchedule.roundNumber);
        expect(fetchedSchedule?.ligueGroupsId).toBe(
            expectedSchedule.ligueGroupsId
        );
        expect(fetchedSchedule?.userOneScore).toBe(
            expectedSchedule.userOneScore
        );
        expect(fetchedSchedule?.userTwoScore).toBe(
            expectedSchedule.userTwoScore
        );

        expect(fetchedSchedule?.userOne.teamName).toBe(
            expectedUserOne?.teamName
        );
        expect(fetchedSchedule?.userOne.logoUrl).toBe(expectedUserOne?.logoUrl);

        expect(fetchedSchedule?.userTwo.teamName).toBe(
            expectedUserTwo?.teamName
        );
        expect(fetchedSchedule?.userTwo.logoUrl).toBe(expectedUserTwo?.logoUrl);
    };

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
        assertFetchedSchedule(schedule, expectedRound1DolceSchedules[0]);

        const schedule2 = findFetchedSchedule(
            round1DolceSchedules,
            expectedRound1DolceSchedules[1]
        );
        assertFetchedSchedule(schedule2, expectedRound1DolceSchedules[1]);
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
        assertFetchedSchedule(schedule, expectedRound2DolceSchedules[0]);

        const schedule2 = findFetchedSchedule(
            round2DolceSchedules,
            expectedRound2DolceSchedules[1]
        );
        assertFetchedSchedule(schedule2, expectedRound2DolceSchedules[1]);
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
        assertFetchedSchedule(schedule, expectedRound1GabbanaSchedules[0]);

        const schedule2 = findFetchedSchedule(
            round1GabbanaSchedules,
            expectedRound1GabbanaSchedules[1]
        );
        assertFetchedSchedule(schedule2, expectedRound1GabbanaSchedules[1]);
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
        assertFetchedSchedule(schedule, expectedRound2GabbanaSchedules[0]);

        const schedule2 = findFetchedSchedule(
            round2GabbanaSchedules,
            expectedRound2GabbanaSchedules[1]
        );
        assertFetchedSchedule(schedule2, expectedRound2GabbanaSchedules[1]);
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

    describe('getScheduleForHistory', () => {
        test('Should return all schedule documents with team names, coach names, scores and stage set to regularSeason', async () => {
            const historySchedules =
                await ScheduleModel.getScheduleForHistory();

            expect(historySchedules).toHaveLength(scheduleData.length);

            scheduleData.forEach((expectedSchedule, index) => {
                const expectedUserOne = findSeededUser(
                    expectedSchedule.userOneId ?? ''
                );
                const expectedUserTwo = findSeededUser(
                    expectedSchedule.userTwoId ?? ''
                );

                const historySchedule = historySchedules.find(
                    schedule =>
                        schedule.userOne.teamName ===
                            expectedUserOne?.teamName &&
                        schedule.userTwo.teamName === expectedUserTwo?.teamName
                );

                expect(historySchedule).toBeDefined();
                expect(historySchedule?.id.toString()).toBe(
                    createdSchedules[index]._id.toString()
                );
                expect(historySchedule?.userOne.coachName).toBe(
                    expectedUserOne?.coachName
                );
                expect(historySchedule?.userTwo.coachName).toBe(
                    expectedUserTwo?.coachName
                );
                expect(historySchedule?.roundNumber).toBe(
                    expectedSchedule.roundNumber
                );
                expect(historySchedule?.userOneScore).toBe(
                    expectedSchedule.userOneScore
                );
                expect(historySchedule?.userTwoScore).toBe(
                    expectedSchedule.userTwoScore
                );
                expect(historySchedule?.stage).toBe('regularSeason');
            });
        });

        test('Should throw error when there is no schedule data', async () => {
            await ScheduleModel.deleteMany();

            await expect(ScheduleModel.getScheduleForHistory()).rejects.toThrow(
                'Schedule not found'
            );

            createdSchedules = await ScheduleModel.create(scheduleData);
        });
    });
});
