import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import HistoryModel from '@/db/models/history/history';
import HistoryGrandPrixChampionModel, {
    ChampionsHistoryGrandPrixDtoType
} from '@/db/models/history/history-grand-prix-champion';
import HistoryTeamModel, {
    HistoryTeamType
} from '@/db/models/history/history-team';
import SeasonOpsModel, { SeasonOpsType } from '@/db/models/season-ops';

// connect to test db before running tests
beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test tear down clear database
beforeEach(async () => {
    await HistoryGrandPrixChampionModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await HistoryModel.deleteMany();
    await SeasonOpsModel.deleteMany();
});

//close connection to server so, that test suite will close
afterAll(async () => {
    await HistoryGrandPrixChampionModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await HistoryModel.deleteMany();
    await SeasonOpsModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test HistoryGrandPrixChampionModel methods and static functions', () => {
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

    test('Should call getChampionsHistory and return populated grand prix champions for 3 seasons', async () => {
        const seasons = await SeasonOpsModel.create([
            createSeasonData('2023'),
            createSeasonData('2024'),
            createSeasonData('2025')
        ]);

        const historyDocuments = await HistoryModel.create([
            { season: seasons[0]._id.toString() },
            { season: seasons[1]._id.toString() },
            { season: seasons[2]._id.toString() }
        ]);

        const teams = await HistoryTeamModel.create([
            createHistoryTeamData(historyDocuments[0]._id.toString(), {
                name: 'Falcons 2023',
                coachName: 'Coach 2023 A',
                logoUrl: 'https://example.com/falcons-2023.png'
            }),
            createHistoryTeamData(historyDocuments[0]._id.toString(), {
                name: 'Wolves 2023',
                coachName: 'Coach 2023 B',
                logoUrl: 'https://example.com/wolves-2023.png'
            }),
            createHistoryTeamData(historyDocuments[1]._id.toString(), {
                name: 'Falcons 2024',
                coachName: 'Coach 2024 A',
                logoUrl: 'https://example.com/falcons-2024.png'
            }),
            createHistoryTeamData(historyDocuments[1]._id.toString(), {
                name: 'Wolves 2024',
                coachName: 'Coach 2024 B',
                logoUrl: 'https://example.com/wolves-2024.png'
            }),
            createHistoryTeamData(historyDocuments[2]._id.toString(), {
                name: 'Falcons 2025',
                coachName: 'Coach 2025 A',
                logoUrl: 'https://example.com/falcons-2025.png'
            }),
            createHistoryTeamData(historyDocuments[2]._id.toString(), {
                name: 'Wolves 2025',
                coachName: 'Coach 2025 B',
                logoUrl: 'https://example.com/wolves-2025.png'
            })
        ]);

        const championsToCreate = [
            {
                season: seasons[0]._id.toString(),
                teamId: teams[1]._id.toString(),
                expectedSeasonName: '2023',
                expectedCoachName: 'Coach 2023 B'
            },
            {
                season: seasons[1]._id.toString(),
                teamId: teams[2]._id.toString(),
                expectedSeasonName: '2024',
                expectedCoachName: 'Coach 2024 A'
            },
            {
                season: seasons[2]._id.toString(),
                teamId: teams[5]._id.toString(),
                expectedSeasonName: '2025',
                expectedCoachName: 'Coach 2025 B'
            }
        ];

        await HistoryGrandPrixChampionModel.create(
            championsToCreate.map(champion => ({
                season: champion.season,
                teamId: champion.teamId
            }))
        );

        const result: ChampionsHistoryGrandPrixDtoType[] =
            await HistoryGrandPrixChampionModel.getChampionsHistory();

        expect(result).toHaveLength(3);

        championsToCreate.forEach(expected => {
            const champion = result.find(
                item => item.seasonName === expected.expectedSeasonName
            );

            expect(champion).toBeDefined();
            expect(champion?.seasonName).toBe(expected.expectedSeasonName);
            expect(champion?.coachName).toBe(expected.expectedCoachName);
        });
    });
});
