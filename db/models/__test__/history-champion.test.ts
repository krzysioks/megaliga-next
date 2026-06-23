import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import HistoryModel from '@/db/models/history/history';
import HistoryChampionModel, {
    PopulatedFindType
} from '@/db/models/history/history-champion';
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
    await HistoryChampionModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await HistoryModel.deleteMany();
    await SeasonOpsModel.deleteMany();
});

//close connection to server so, that test suite will close
afterAll(async () => {
    await HistoryChampionModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await HistoryModel.deleteMany();
    await SeasonOpsModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test HistoryChampionModel methods and static functions', () => {
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

    test('Should call getChampionsHistory and return populated champions for 3 seasons', async () => {
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
                logoUrl: 'https://example.com/falcons-2023.png'
            }),
            createHistoryTeamData(historyDocuments[0]._id.toString(), {
                name: 'Wolves 2023',
                logoUrl: 'https://example.com/wolves-2023.png'
            }),
            createHistoryTeamData(historyDocuments[1]._id.toString(), {
                name: 'Falcons 2024',
                logoUrl: 'https://example.com/falcons-2024.png'
            }),
            createHistoryTeamData(historyDocuments[1]._id.toString(), {
                name: 'Wolves 2024',
                logoUrl: 'https://example.com/wolves-2024.png'
            }),
            createHistoryTeamData(historyDocuments[2]._id.toString(), {
                name: 'Falcons 2025',
                logoUrl: 'https://example.com/falcons-2025.png'
            }),
            createHistoryTeamData(historyDocuments[2]._id.toString(), {
                name: 'Wolves 2025',
                logoUrl: 'https://example.com/wolves-2025.png'
            })
        ]);

        const championsToCreate = [
            {
                season: seasons[0]._id.toString(),
                teamId: teams[0]._id.toString(),
                expectedSeasonName: '2023',
                expectedTeamName: 'Falcons 2023',
                expectedLogoUrl: 'https://example.com/falcons-2023.png'
            },
            {
                season: seasons[1]._id.toString(),
                teamId: teams[3]._id.toString(),
                expectedSeasonName: '2024',
                expectedTeamName: 'Wolves 2024',
                expectedLogoUrl: 'https://example.com/wolves-2024.png'
            },
            {
                season: seasons[2]._id.toString(),
                teamId: teams[4]._id.toString(),
                expectedSeasonName: '2025',
                expectedTeamName: 'Falcons 2025',
                expectedLogoUrl: 'https://example.com/falcons-2025.png'
            }
        ];

        await HistoryChampionModel.create(
            championsToCreate.map(champion => ({
                season: champion.season,
                teamId: champion.teamId
            }))
        );

        const result: PopulatedFindType[] =
            await HistoryChampionModel.getChampionsHistory();

        expect(result).toHaveLength(3);

        championsToCreate.forEach(expected => {
            const champion = result.find(
                item => item.season?.name === expected.expectedSeasonName
            );

            expect(champion).toBeDefined();
            expect(champion?.season?.name).toBe(expected.expectedSeasonName);
            expect(champion?.teamId?.name).toBe(expected.expectedTeamName);
            expect(champion?.teamId?.logoUrl).toBe(expected.expectedLogoUrl);
        });
    });
});
