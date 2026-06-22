import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import RoundCalendarModel, {
    RoundCalendarType
} from '@/db/models/round-calendar';

// connect to test db before running tests
beforeAll(async () => {
    // Mock console.error to silence logs during testing
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test tear down clear database
beforeEach(async () => {
    await RoundCalendarModel.deleteMany();
});

//close connection to server so, that test suite will close
afterAll(async () => {
    await RoundCalendarModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test RoundCalendarModel methods and static functions', () => {
    const generateRoundDates = (
        numberOfRounds: number
    ): RoundCalendarType[] => {
        const baseDate = new Date('2026-01-01');
        return Array.from({ length: numberOfRounds }, (_, i) => {
            const date = new Date(baseDate);
            date.setMonth(date.getMonth() + i);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return {
                roundNumber: i + 1,
                roundDate: `${day}-${month}-${year}`
            };
        });
    };

    test('Should get all round dates', async () => {
        await RoundCalendarModel.insertMany(generateRoundDates(14));

        const result = await RoundCalendarModel.getRoundDates();
        expect(result.length).toBe(14);
        expect(result[0].roundNumber).toBe(1);
        expect(result[0].roundDate).toBe('01-01-2026');
        expect(result[13].roundNumber).toBe(14);
        expect(result[13].roundDate).toBe('01-02-2027');
    });

    test('Should set round dates if none exists', async () => {
        const roundDates = generateRoundDates(14);
        await RoundCalendarModel.setRoundDates(roundDates);

        const result = await RoundCalendarModel.getRoundDates();
        expect(result.length).toBe(14);
        expect(result[0].roundNumber).toBe(1);
        expect(result[0].roundDate).toBe('01-01-2026');
        expect(result[13].roundNumber).toBe(14);
        expect(result[13].roundDate).toBe('01-02-2027');
    });

    test('Should updated only provided round dates', async () => {
        await RoundCalendarModel.insertMany(generateRoundDates(14));

        await RoundCalendarModel.setRoundDates([
            {
                roundNumber: 5,
                roundDate: '15-05-2026'
            },
            {
                roundNumber: 10,
                roundDate: '20-10-2026'
            }
        ]);

        const result = await RoundCalendarModel.getRoundDates();
        expect(result[4].roundDate).toBe('15-05-2026');
        expect(result[9].roundDate).toBe('20-10-2026');
    });

    test('Should reject empty array in setRoundDates', async () => {
        await expect(RoundCalendarModel.setRoundDates([])).rejects.toThrow(
            'No round dates provided for setting.'
        );
    });

    test('Should reject invalid date format in setRoundDates', async () => {
        const invalidRoundDates = [
            {
                roundNumber: 1,
                roundDate: '2026-01-01' // Invalid: should be DD-MM-YYYY
            }
        ];

        await expect(
            RoundCalendarModel.setRoundDates(invalidRoundDates)
        ).rejects.toThrow(
            'Invalid date format for round 1: 2026-01-01. Expected format is DD-MM-RRRR.'
        );
    });
});
