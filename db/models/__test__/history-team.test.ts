import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import HistoryTeamModel, {
    HistoryTeamType
} from '@/db/models/history/history-team';

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

beforeEach(async () => {
    await HistoryTeamModel.deleteMany();
});

afterAll(async () => {
    await HistoryTeamModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test HistoryTeamModel methods and static functions', () => {
    const createHistoryTeamData = (
        overrides: Partial<HistoryTeamType> = {}
    ): HistoryTeamType => ({
        historyId: new mongoose.Types.ObjectId().toString(),
        name: 'Default Team',
        coachName: 'Default Coach',
        logoUrl: 'https://example.com/default-team.png',
        ...overrides
    });

    describe('saveSeasonTeams', () => {
        test('should only save non existing teams to history-teams collection', async () => {
            await HistoryTeamModel.create(
                createHistoryTeamData({
                    name: 'Team A',
                    coachName: 'Coach A'
                })
            );

            const teamsToSave = [
                createHistoryTeamData({
                    name: 'Team A',
                    coachName: 'Coach A'
                }),
                createHistoryTeamData({
                    name: 'Team B',
                    coachName: 'Coach B'
                })
            ];

            await HistoryTeamModel.saveSeasonTeams(teamsToSave);

            const allTeams = await HistoryTeamModel.find().exec();

            expect(allTeams).toHaveLength(2);
            expect(
                allTeams.filter(
                    team =>
                        team.name === 'Team A' && team.coachName === 'Coach A'
                )
            ).toHaveLength(1);
            expect(
                allTeams.some(
                    team =>
                        team.name === 'Team B' && team.coachName === 'Coach B'
                )
            ).toBe(true);
        });
    });

    describe('getHistoryTeamIdByNameAndCoachName', () => {
        test('should find and return id of history team for provided name and coachName', async () => {
            const team = await HistoryTeamModel.create(
                createHistoryTeamData({
                    name: 'Team A',
                    coachName: 'Coach A'
                })
            );

            const result =
                await HistoryTeamModel.getHistoryTeamIdByNameAndCoachName(
                    'Team A',
                    'Coach A'
                );

            expect(result).toBe(team._id.toString());
        });

        test('should throw error if history team not found', async () => {
            await expect(
                HistoryTeamModel.getHistoryTeamIdByNameAndCoachName(
                    'Missing Team',
                    'Missing Coach'
                )
            ).rejects.toThrow(
                'History team not found for name: Missing Team and coachName: Missing Coach'
            );
        });
    });
});
