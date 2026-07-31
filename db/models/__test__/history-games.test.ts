import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import HistoryGamesModel, {
    HistoryGamesType,
    UserSeasonGamesByStageReturnType
} from '@/db/models/history/history-games';
import HistoryTeamModel, {
    HistoryTeamType
} from '@/db/models/history/history-team';
import SeasonOpsModel, { SeasonOpsType } from '@/db/models/season-ops';

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

beforeEach(async () => {
    await HistoryGamesModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await SeasonOpsModel.deleteMany();
});

afterAll(async () => {
    await HistoryGamesModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await SeasonOpsModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test HistoryGamesModel methods and static functions', () => {
    const createSeasonData = (
        name: string,
        overrides: Partial<SeasonOpsType> = {}
    ): SeasonOpsType => ({
        name,
        isCurrentSeason: false,
        numberOfGroups: 2,
        showGroupNames: false,
        isScoreCalculatded: {
            1: false,
            2: false,
            3: false,
            4: false,
            5: false,
            6: false,
            7: false,
            8: false,
            9: false,
            10: false,
            11: false,
            12: false,
            13: false,
            14: false
        },
        isScoreCalculatdedPlayoff: {
            1: false,
            2: false,
            3: false,
            4: false
        },
        ...overrides
    });

    const createHistoryTeamData = (
        historyId: string,
        overrides: Partial<HistoryTeamType> = {}
    ): HistoryTeamType => ({
        historyId,
        name: 'Default Team',
        coachName: 'Default Coach',
        logoUrl: 'https://example.com/default-team.png',
        ...overrides
    });

    test('should throw error if seasonId is not valid', async () => {
        const user = await HistoryTeamModel.create(
            createHistoryTeamData(new mongoose.Types.ObjectId().toString())
        );
        const fakeSeasonId = new mongoose.Types.ObjectId().toString();

        await expect(
            HistoryGamesModel.getUserSeasonGamesByStage(
                fakeSeasonId,
                user._id.toString(),
                'regularSeason'
            )
        ).rejects.toThrow(`Invalid seasonId: ${fakeSeasonId}`);
    });

    test('should throw error if userId is not valid', async () => {
        const season = await SeasonOpsModel.create(createSeasonData('2024'));
        const fakeUserId = new mongoose.Types.ObjectId().toString();

        await expect(
            HistoryGamesModel.getUserSeasonGamesByStage(
                season._id.toString(),
                fakeUserId,
                'regularSeason'
            )
        ).rejects.toThrow(`Invalid userId: ${fakeUserId}`);
    });

    test('should throw error if no documents found', async () => {
        const season = await SeasonOpsModel.create(createSeasonData('2024'));
        const user = await HistoryTeamModel.create(
            createHistoryTeamData(new mongoose.Types.ObjectId().toString(), {
                name: 'Team A'
            })
        );

        await expect(
            HistoryGamesModel.getUserSeasonGamesByStage(
                season._id.toString(),
                user._id.toString(),
                'regularSeason'
            )
        ).rejects.toThrow(
            `No games found for seasonId: ${season._id.toString()}, userId: ${user._id.toString()}, stage: regularSeason`
        );
    });

    test('should get proper list of games for given season', async () => {
        const season = await SeasonOpsModel.create(createSeasonData('2024'));

        const teams = await HistoryTeamModel.create([
            createHistoryTeamData(new mongoose.Types.ObjectId().toString(), {
                name: 'Team A',
                logoUrl: 'https://example.com/team-a.png'
            }),
            createHistoryTeamData(new mongoose.Types.ObjectId().toString(), {
                name: 'Team B',
                logoUrl: 'https://example.com/team-b.png'
            }),
            createHistoryTeamData(new mongoose.Types.ObjectId().toString(), {
                name: 'Team C',
                logoUrl: 'https://example.com/team-c.png'
            })
        ]);

        const historyGamesDoc: HistoryGamesType = {
            season: season._id.toString(),
            games: [
                {
                    teamOne: {
                        teamId: teams[0]._id.toString(),
                        score: 46
                    },
                    teamTwo: {
                        teamId: teams[1]._id.toString(),
                        score: 44
                    },
                    roundNumber: 1,
                    stage: 'regularSeason',
                    scoreDetails: new mongoose.Types.ObjectId().toString()
                },
                {
                    teamOne: {
                        teamId: teams[2]._id.toString(),
                        score: 43
                    },
                    teamTwo: {
                        teamId: teams[0]._id.toString(),
                        score: 47
                    },
                    roundNumber: 2,
                    stage: 'regularSeason',
                    scoreDetails: new mongoose.Types.ObjectId().toString()
                }
            ]
        };

        await HistoryGamesModel.create(historyGamesDoc);

        const result: UserSeasonGamesByStageReturnType[] =
            await HistoryGamesModel.getUserSeasonGamesByStage(
                season._id.toString(),
                teams[0]._id.toString(),
                'regularSeason'
            );

        expect(result).toHaveLength(2);

        expect(result[0]).toEqual(
            expect.objectContaining({
                roundNumber: 1,
                teamOne: {
                    teamName: 'Team A',
                    logoUrl: 'https://example.com/team-a.png',
                    score: 46
                },
                teamTwo: {
                    teamName: 'Team B',
                    logoUrl: 'https://example.com/team-b.png',
                    score: 44
                }
            })
        );

        expect(result[1]).toEqual(
            expect.objectContaining({
                roundNumber: 2,
                teamOne: {
                    teamName: 'Team C',
                    logoUrl: 'https://example.com/team-c.png',
                    score: 43
                },
                teamTwo: {
                    teamName: 'Team A',
                    logoUrl: 'https://example.com/team-a.png',
                    score: 47
                }
            })
        );
    });
});
