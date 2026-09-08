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

    describe('getHistorySeasons', () => {
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
            expect(result[0].id.toString()).toBe(
                newerHistorySeason._id.toString()
            );
            expect(result[1].name).toBe('2023');
            expect(result[1].id.toString()).toBe(
                olderHistorySeason._id.toString()
            );
        });

        test('should return empty array if no documents with isCurrentSeason = false are returned', async () => {
            await SeasonOpsModel.create(
                createSeasonData('2025', { isCurrentSeason: true })
            );

            const result = await SeasonOpsModel.getHistorySeasons();

            expect(result).toEqual([]);
        });
    });

    describe('getCurrentSeason', () => {
        test('should return current season (id and name)', async () => {
            await SeasonOpsModel.create(createSeasonData('2024'));
            const currentSeason = await SeasonOpsModel.create(
                createSeasonData('2025', { isCurrentSeason: true })
            );

            const result = await SeasonOpsModel.getCurrentSeason();

            expect(result.id.toString()).toBe(currentSeason._id.toString());
            expect(result.name).toBe('2025');
        });
    });

    describe('updateSeason', () => {
        test('Should update provided fields on season document', async () => {
            const season = await SeasonOpsModel.create(
                createSeasonData('2024')
            );

            await season.updateSeason({
                isCurrentSeason: true,
                numberOfGroups: 1,
                showGroupNames: true
            });

            const updatedSeason = await SeasonOpsModel.findById(
                season._id
            ).exec();

            expect(updatedSeason).not.toBeNull();
            expect(updatedSeason?.isCurrentSeason).toBe(true);
            expect(updatedSeason?.numberOfGroups).toBe(1);
            expect(updatedSeason?.showGroupNames).toBe(true);
        });

        test('Should ignore fields with undefined value in updateSeason method', async () => {
            const season = await SeasonOpsModel.create(
                createSeasonData('2024', { numberOfGroups: 2 })
            );

            await season.updateSeason({
                numberOfGroups: undefined,
                showGroupNames: true
            });

            const updatedSeason = await SeasonOpsModel.findById(
                season._id
            ).exec();

            expect(updatedSeason).not.toBeNull();
            expect(updatedSeason?.numberOfGroups).toBe(2);
            expect(updatedSeason?.showGroupNames).toBe(true);
        });
    });

    describe('setNewSeason', () => {
        test('should successfully add new season', async () => {
            const currentSeason = await SeasonOpsModel.create(
                createSeasonData('2025', { isCurrentSeason: true })
            );

            await SeasonOpsModel.setNewSeason();

            const newSeasonDocument = await SeasonOpsModel.findOne({
                name: '2026'
            }).exec();

            expect(newSeasonDocument).not.toBeNull();
            expect(newSeasonDocument?.isCurrentSeason).toBe(true);
            expect(newSeasonDocument?.numberOfGroups).toBe(2);
            expect(newSeasonDocument?.showGroupNames).toBe(false);
            expect(newSeasonDocument?.isScoreCalculatded).toEqual({
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
            });
            expect(newSeasonDocument?.isScoreCalculatdedPlayoff).toEqual({
                1: false,
                2: false,
                3: false,
                4: false
            });

            const previousSeasonDocument = await SeasonOpsModel.findById(
                currentSeason._id
            ).exec();

            expect(previousSeasonDocument?.isCurrentSeason).toBe(false);
        });

        test('should throw error if current season not found', async () => {
            await expect(SeasonOpsModel.setNewSeason()).rejects.toThrow(
                'Current season not found'
            );
        });

        test('should throw error if findbyId to find current season document did not found it', async () => {
            const currentSeason = await SeasonOpsModel.create(
                createSeasonData('2025', { isCurrentSeason: true })
            );

            const findByIdSpy = jest
                .spyOn(SeasonOpsModel, 'findById')
                .mockReturnValueOnce({
                    exec: jest.fn().mockResolvedValueOnce(null)
                } as unknown as ReturnType<typeof SeasonOpsModel.findById>);

            await expect(SeasonOpsModel.setNewSeason()).rejects.toThrow(
                `Season document not found for id: ${currentSeason._id}`
            );

            findByIdSpy.mockRestore();
        });
    });
});
