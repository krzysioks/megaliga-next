import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import StartingLineupStatusModel from '@/db/models/games/starting-lineup-status';

// connect to test db before running tests
beforeAll(async () => {
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test clear collection
beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await StartingLineupStatusModel.deleteMany();
});

// close connection to server so that test suite will close
afterAll(async () => {
    await StartingLineupStatusModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test StartingLineupStatusModel methods and static functions', () => {
    describe('getStartingLineupStatusByRoundAndStage', () => {
        test('Should return isOpen status for given roundNumber and seasonStage', async () => {
            await StartingLineupStatusModel.create([
                {
                    roundNumber: 1,
                    seasonStage: 'regularSeason',
                    isOpen: true
                },
                {
                    roundNumber: 2,
                    seasonStage: 'playoff',
                    isOpen: false
                }
            ]);

            const regularSeasonStatus =
                await StartingLineupStatusModel.getStartingLineupStatusByRoundAndStage(
                    1,
                    'regularSeason'
                );
            const playoffStatus =
                await StartingLineupStatusModel.getStartingLineupStatusByRoundAndStage(
                    2,
                    'playoff'
                );

            expect(regularSeasonStatus).toBe(true);
            expect(playoffStatus).toBe(false);
        });

        test('Should throw error if document not found for given roundNumber and seasonStage', async () => {
            await expect(
                StartingLineupStatusModel.getStartingLineupStatusByRoundAndStage(
                    3,
                    'playIn'
                )
            ).rejects.toThrow(
                'Failed to fetch starting lineup status for round: 3 and season stage: playIn'
            );
        });
    });

    describe('resetStartingLineupStatus', () => {
        test('Should set isOpen to false for all documents', async () => {
            await StartingLineupStatusModel.create([
                {
                    roundNumber: 1,
                    seasonStage: 'regularSeason',
                    isOpen: true
                },
                {
                    roundNumber: 2,
                    seasonStage: 'playoff',
                    isOpen: true
                }
            ]);

            await StartingLineupStatusModel.resetStartingLineupStatus();

            const documents = await StartingLineupStatusModel.find().exec();

            expect(documents).toHaveLength(2);
            documents.forEach(document => {
                expect(document.isOpen).toBe(false);
            });
        });
    });
});
