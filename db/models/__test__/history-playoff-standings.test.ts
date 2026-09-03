import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import SchedulePlayoffModel, {
    SchedulePlayoffType
} from '@/db/models/games/schedule-playoff';
import HistoryPlayoffStandingsModel, {
    HistoryPlayoffStandingsType
} from '@/db/models/history/history-playoff-standings';
import HistoryTeamModel, {
    HistoryTeamType
} from '@/db/models/history/history-team';
import UserModel, { UserType } from '@/db/models/user';

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

beforeEach(async () => {
    await HistoryPlayoffStandingsModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await SchedulePlayoffModel.deleteMany();
    await UserModel.deleteMany();
});

afterAll(async () => {
    await HistoryPlayoffStandingsModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await SchedulePlayoffModel.deleteMany();
    await UserModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test HistoryPlayoffStandingsModel methods and static functions', () => {
    const createUserData = (index: number): UserType => ({
        username: `user-${index + 1}`,
        coachName: `Coach ${index + 1}`,
        email: `user-${index + 1}@example.com`,
        password: 'Password1!',
        teamName: `Team ${index + 1}`,
        logoUrl: `https://example.com/team-${index + 1}.png`,
        reachedPlayoff: false,
        isFirstRoundDraftOrderDraw: false,
        groupName: new mongoose.Types.ObjectId().toString(),
        bio: `User ${index + 1} bio`,
        cabinetTrophy: [],
        isAdmin: false
    });

    const createHistoryTeamData = (
        overrides: Partial<HistoryTeamType> = {}
    ): HistoryTeamType => ({
        historyId: new mongoose.Types.ObjectId().toString(),
        name: 'Default Team',
        coachName: 'Default Coach',
        logoUrl: 'https://example.com/default-team.png',
        ...overrides
    });

    const createStageDocs = (
        stage: SchedulePlayoffType['stage'],
        userOneId: string,
        userTwoId: string
    ): SchedulePlayoffType[] => [
        {
            stage,
            roundNumber: 1,
            userOneId,
            userTwoId,
            userOneSeed: 1,
            userTwoSeed: 2,
            userOneScore: 44,
            userTwoScore: 40
        },
        {
            stage,
            roundNumber: 2,
            userOneId,
            userTwoId,
            userOneSeed: 1,
            userTwoSeed: 2,
            userOneScore: 42,
            userTwoScore: 36
        }
    ];

    describe('savePlayoffStandingsToHistory', () => {
        test('should throw error if await SchedulePlayoffModel.getStandingsForHistory() will not return data', async () => {
            const seasonId = new mongoose.Types.ObjectId().toString();

            await expect(
                HistoryPlayoffStandingsModel.savePlayoffStandingsToHistory(
                    seasonId
                )
            ).rejects.toThrow(
                'Final standings not found: missing final or 3rdplace schedule data'
            );
        });

        test('should throw error if await HistoryTeamModel.getHistoryTeamIdByNameAndCoachName will not return data', async () => {
            const [finalUserOne, finalUserTwo, thirdUserOne, thirdUserTwo] =
                await UserModel.create([
                    createUserData(0),
                    createUserData(1),
                    createUserData(2),
                    createUserData(3)
                ]);

            await SchedulePlayoffModel.create([
                ...createStageDocs(
                    'final',
                    finalUserOne._id.toString(),
                    finalUserTwo._id.toString()
                ),
                ...createStageDocs(
                    '3rdplace',
                    thirdUserOne._id.toString(),
                    thirdUserTwo._id.toString()
                )
            ]);

            const seasonId = new mongoose.Types.ObjectId().toString();

            // no matching HistoryTeam documents created for any of these users' teamName/coachName
            await expect(
                HistoryPlayoffStandingsModel.savePlayoffStandingsToHistory(
                    seasonId
                )
            ).rejects.toThrow(
                `History team not found for name: ${finalUserOne.teamName} and coachName: ${finalUserOne.coachName}`
            );
        });

        test('should properly create a document with history playoff standings data with correct type and values', async () => {
            const [finalUserOne, finalUserTwo, thirdUserOne, thirdUserTwo] =
                await UserModel.create([
                    createUserData(0),
                    createUserData(1),
                    createUserData(2),
                    createUserData(3)
                ]);

            await SchedulePlayoffModel.create([
                ...createStageDocs(
                    'final',
                    finalUserOne._id.toString(),
                    finalUserTwo._id.toString()
                ),
                ...createStageDocs(
                    '3rdplace',
                    thirdUserOne._id.toString(),
                    thirdUserTwo._id.toString()
                )
            ]);

            const historyTeams = await HistoryTeamModel.create([
                createHistoryTeamData({
                    name: finalUserOne.teamName,
                    coachName: finalUserOne.coachName
                }),
                createHistoryTeamData({
                    name: finalUserTwo.teamName,
                    coachName: finalUserTwo.coachName
                }),
                createHistoryTeamData({
                    name: thirdUserOne.teamName,
                    coachName: thirdUserOne.coachName
                }),
                createHistoryTeamData({
                    name: thirdUserTwo.teamName,
                    coachName: thirdUserTwo.coachName
                })
            ]);

            const seasonId = new mongoose.Types.ObjectId().toString();

            const savedDocumentId =
                await HistoryPlayoffStandingsModel.savePlayoffStandingsToHistory(
                    seasonId
                );

            const savedDocument: HistoryPlayoffStandingsType | null =
                await HistoryPlayoffStandingsModel.findById(savedDocumentId)
                    .lean()
                    .exec();

            expect(savedDocument).not.toBeNull();
            expect(savedDocument?.season?.toString()).toBe(seasonId);
            expect(savedDocument?.standings).toHaveLength(4);

            const [first, second, third, fourth] =
                savedDocument?.standings ?? [];

            expect(first?.place).toBe(1);
            expect(first?.teamId?.toString()).toBe(
                historyTeams[0]._id.toString()
            );

            expect(second?.place).toBe(2);
            expect(second?.teamId?.toString()).toBe(
                historyTeams[1]._id.toString()
            );

            expect(third?.place).toBe(3);
            expect(third?.teamId?.toString()).toBe(
                historyTeams[2]._id.toString()
            );

            expect(fourth?.place).toBe(4);
            expect(fourth?.teamId?.toString()).toBe(
                historyTeams[3]._id.toString()
            );
        });
    });
});
