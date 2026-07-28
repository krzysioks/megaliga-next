import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import SeasonOpsModel, { SeasonOpsType } from '@/db/models/season-ops';

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

beforeEach(async () => {
    await SeasonOpsModel.deleteMany();
});

afterAll(async () => {
    await SeasonOpsModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test SeasonOpsModel methods and static functions', () => {
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

    test('should fetch season name and id for history seasons only in descending order', async () => {
        const olderHistorySeason = await SeasonOpsModel.create(
            createSeasonData('2023')
        );
        const newerHistorySeason = await SeasonOpsModel.create(
            createSeasonData('2024')
        );
        await SeasonOpsModel.create(
            createSeasonData('2025', { isCurrentSeason: true })
        );

        const result = await SeasonOpsModel.getHistorySeasons();

        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('2024');
        expect(result[0].id.toString()).toBe(newerHistorySeason._id.toString());
        expect(result[1].name).toBe('2023');
        expect(result[1].id.toString()).toBe(olderHistorySeason._id.toString());
    });

    test('should return empty array if no documents with isCurrentSeason = false are returned', async () => {
        await SeasonOpsModel.create(
            createSeasonData('2025', { isCurrentSeason: true })
        );

        const result = await SeasonOpsModel.getHistorySeasons();

        expect(result).toEqual([]);
    });
});
