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

    describe('setStartingLineupStatus', () => {
        test('Should update existing document with isOpen state', async () => {
            await StartingLineupStatusModel.create({
                roundNumber: 1,
                seasonStage: 'regularSeason',
                isOpen: false
            });

            await StartingLineupStatusModel.setStartingLineupStatus(
                1,
                'regularSeason',
                true
            );

            const document = await StartingLineupStatusModel.findOne({
                roundNumber: 1,
                seasonStage: 'regularSeason'
            }).exec();

            expect(document?.isOpen).toBe(true);
        });

        test('Should add new document if document for given roundNumber and seasonStage does not exist', async () => {
            await StartingLineupStatusModel.setStartingLineupStatus(
                3,
                'playIn',
                true
            );

            const document = await StartingLineupStatusModel.findOne({
                roundNumber: 3,
                seasonStage: 'playIn'
            }).exec();

            expect(document?.isOpen).toBe(true);
        });

        test('Should not allow to set roundNumber > 14 if seasonStage === regularSeason', async () => {
            await expect(
                StartingLineupStatusModel.setStartingLineupStatus(
                    15,
                    'regularSeason',
                    true
                )
            ).rejects.toThrow(
                'Invalid roundNumber: 15 for regularSeason. Max allowed is 14'
            );
        });

        test('Should not allow to set roundNumber > 4 if seasonStage === playoff', async () => {
            await expect(
                StartingLineupStatusModel.setStartingLineupStatus(
                    5,
                    'playoff',
                    true
                )
            ).rejects.toThrow(
                'Invalid roundNumber: 5 for playoff. Max allowed is 4'
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
