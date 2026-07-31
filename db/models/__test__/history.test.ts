import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import HistoryModel, {
    HistoryBySeasonReturnType
} from '@/db/models/history/history';
import HistoryGrandPrixStandingsModel, {
    HistoryGrandPrixStandingsType
} from '@/db/models/history/history-grand-prix-standings';
import HistoryPlayInStandingsModel, {
    HistoryPlayinStandingsType
} from '@/db/models/history/history-playin-standings';
import HistoryPlayoffStandingsModel, {
    HistoryPlayoffStandingsType
} from '@/db/models/history/history-playoff-standings';
import HistoryRegularSeasonStandingsModel, {
    HistoryRegularSeasonStandingsType
} from '@/db/models/history/history-regular-season-standings';
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
    await HistoryModel.deleteMany();
    await HistoryRegularSeasonStandingsModel.deleteMany();
    await HistoryPlayoffStandingsModel.deleteMany();
    await HistoryPlayInStandingsModel.deleteMany();
    await HistoryGrandPrixStandingsModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await SeasonOpsModel.deleteMany();
});

afterAll(async () => {
    await HistoryModel.deleteMany();
    await HistoryRegularSeasonStandingsModel.deleteMany();
    await HistoryPlayoffStandingsModel.deleteMany();
    await HistoryPlayInStandingsModel.deleteMany();
    await HistoryGrandPrixStandingsModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await SeasonOpsModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test HistoryModel methods and static functions', () => {
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

    test('should fetch history by season id with all segments populated and mapped to DTO', async () => {
        const season = await SeasonOpsModel.create(createSeasonData('2024'));

        const historyDoc = await HistoryModel.create({
            season: season._id.toString()
        });

        const teams = await HistoryTeamModel.create([
            createHistoryTeamData(historyDoc._id.toString(), {
                name: 'Team A',
                coachName: 'Coach A',
                logoUrl: 'https://example.com/team-a.png'
            }),
            createHistoryTeamData(historyDoc._id.toString(), {
                name: 'Team B',
                coachName: 'Coach B',
                logoUrl: 'https://example.com/team-b.png'
            }),
            createHistoryTeamData(historyDoc._id.toString(), {
                name: 'Team C',
                coachName: 'Coach C',
                logoUrl: 'https://example.com/team-c.png'
            })
        ]);

        const regularSeasonStandings =
            await HistoryRegularSeasonStandingsModel.create({
                season: season._id.toString(),
                standings: [
                    {
                        place: 1,
                        teamId: teams[0]._id.toString(),
                        played: 14,
                        wins: 10,
                        draw: 2,
                        defeat: 2,
                        balance: 15,
                        points: 70,
                        ligueGroup: 'Group A'
                    },
                    {
                        place: 2,
                        teamId: teams[1]._id.toString(),
                        played: 14,
                        wins: 8,
                        draw: 3,
                        defeat: 3,
                        balance: 12,
                        points: 60,
                        ligueGroup: 'Group A'
                    }
                ]
            } as HistoryRegularSeasonStandingsType);

        const playoffStandings = await HistoryPlayoffStandingsModel.create({
            season: season._id.toString(),
            standings: [
                {
                    place: 1,
                    teamId: teams[0]._id.toString()
                },
                {
                    place: 2,
                    teamId: teams[1]._id.toString()
                }
            ]
        } as HistoryPlayoffStandingsType);

        const playInStandings = await HistoryPlayInStandingsModel.create({
            season: season._id.toString(),
            standings: [
                {
                    place: 1,
                    teamId: teams[2]._id.toString(),
                    played: 10,
                    wins: 7,
                    draw: 2,
                    defeat: 1,
                    balance: 10,
                    points: 50
                }
            ]
        } as HistoryPlayinStandingsType);

        const grandPrixStandings = await HistoryGrandPrixStandingsModel.create({
            season: season._id.toString(),
            standings: [
                {
                    place: 1,
                    teamId: teams[0]._id.toString(),
                    played: 10,
                    points: 150
                },
                {
                    place: 2,
                    teamId: teams[1]._id.toString(),
                    played: 10,
                    points: 130
                }
            ]
        } as HistoryGrandPrixStandingsType);

        await HistoryModel.findByIdAndUpdate(historyDoc._id, {
            regularSeason: regularSeasonStandings._id.toString(),
            playoff: playoffStandings._id.toString(),
            playIn: playInStandings._id.toString(),
            grandPrix: grandPrixStandings._id.toString()
        });

        const result: HistoryBySeasonReturnType =
            await HistoryModel.getHistoryBySeasonId(season._id.toString());

        expect(result).toBeDefined();

        // Test regular season
        expect(result.regularSeason).toHaveLength(2);
        expect(result.regularSeason?.[0]).toEqual(
            expect.objectContaining({
                place: 1,
                played: 14,
                wins: 10,
                draw: 2,
                defeat: 2,
                balance: 15,
                points: 70,
                ligueGroup: 'Group A',
                teamId: teams[0]._id.toString(),
                teamName: 'Team A'
            })
        );
        expect(result.regularSeason?.[1].teamName).toBe('Team B');

        // Test playoff
        expect(result.playoff).toHaveLength(2);
        expect(result.playoff?.[0]).toEqual(
            expect.objectContaining({
                place: 1,
                teamId: teams[0]._id.toString(),
                teamName: 'Team A'
            })
        );

        // Test play-in
        expect(result.playIn).toHaveLength(1);
        expect(result.playIn?.[0]).toEqual(
            expect.objectContaining({
                place: 1,
                played: 10,
                wins: 7,
                draw: 2,
                defeat: 1,
                balance: 10,
                points: 50,
                teamId: teams[2]._id.toString(),
                teamName: 'Team C'
            })
        );

        // Test grand prix
        expect(result.grandPrix).toHaveLength(2);
        expect(result.grandPrix?.[0]).toEqual(
            expect.objectContaining({
                place: 1,
                played: 10,
                points: 150,
                coachName: 'Coach A'
            })
        );
    });

    test('should throw error when history is not found for given seasonId', async () => {
        const fakeSeasonId = new mongoose.Types.ObjectId().toString();

        await expect(
            HistoryModel.getHistoryBySeasonId(fakeSeasonId)
        ).rejects.toThrow(`History not found for seasonId: ${fakeSeasonId}`);
    });

    test('should return null for missing segment references', async () => {
        const season = await SeasonOpsModel.create(createSeasonData('2024'));

        const historyDoc = await HistoryModel.create({
            season: season._id.toString()
            // regularSeason, playoff, playIn, grandPrix are all undefined
        });

        const teams = await HistoryTeamModel.create([
            createHistoryTeamData(historyDoc._id.toString(), {
                name: 'Team A',
                logoUrl: 'https://example.com/team-a.png'
            })
        ]);

        const regularSeasonStandings =
            await HistoryRegularSeasonStandingsModel.create({
                season: season._id.toString(),
                standings: [
                    {
                        place: 1,
                        teamId: teams[0]._id.toString(),
                        played: 14,
                        wins: 10,
                        draw: 2,
                        defeat: 2,
                        balance: 15,
                        points: 70,
                        ligueGroup: 'Group A'
                    }
                ]
            } as HistoryRegularSeasonStandingsType);

        // Only set regularSeason, leave others null
        await HistoryModel.findByIdAndUpdate(historyDoc._id, {
            regularSeason: regularSeasonStandings._id.toString()
        });

        const result: HistoryBySeasonReturnType =
            await HistoryModel.getHistoryBySeasonId(season._id.toString());

        expect(result.regularSeason).toHaveLength(1);
        expect(result.regularSeason?.[0].teamName).toBe('Team A');

        expect(result.playoff).toBeNull();
        expect(result.playIn).toBeNull();
        expect(result.grandPrix).toBeNull();
    });
});
