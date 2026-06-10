import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import PlayersModel, { PlayersType } from '@/db/models/players';

const createPlayerData = (overrides: Partial<PlayersType> = {}) => ({
    extraligaPlayerName: 'Player One',
    dolceUserId: new mongoose.Types.ObjectId().toString(),
    gabbanaUserId: new mongoose.Types.ObjectId().toString(),
    playoffUserId: new mongoose.Types.ObjectId().toString(),
    draftedWithNumberDolce: 1,
    draftedWithNumberGabbana: 2,
    draftedWithNumberPlayoff: 3,
    playerStatus: 'active' as const,
    statistics: new mongoose.Types.ObjectId().toString(),
    ...overrides
});

// connect to test db before running tests
beforeAll(async () => {
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test clear collection
beforeEach(async () => {
    await PlayersModel.deleteMany();
});

// close connection to server so that test suite will close
afterAll(async () => {
    await PlayersModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test PlayersModel methods and static functions', () => {
    it('Should get players by user id for a given assignment type', async () => {
        type AssignmentField =
            | 'dolceUserId'
            | 'gabbanaUserId'
            | 'playoffUserId';

        const buildPlayersForAssignment = (
            count: number,
            field: AssignmentField,
            firstUserId: string,
            secondUserId: string,
            prefix: string
        ) =>
            Array.from({ length: count }, (_, index) =>
                createPlayerData({
                    extraligaPlayerName: `${prefix}-player-${index + 1}`,
                    [field]: index % 2 === 0 ? firstUserId : secondUserId
                } as Partial<PlayersType>)
            );

        const dolceUserOneId = new mongoose.Types.ObjectId().toString();
        const dolceUserTwoId = new mongoose.Types.ObjectId().toString();
        const gabbanaUserOneId = new mongoose.Types.ObjectId().toString();
        const gabbanaUserTwoId = new mongoose.Types.ObjectId().toString();
        const playoffUserOneId = new mongoose.Types.ObjectId().toString();
        const playoffUserTwoId = new mongoose.Types.ObjectId().toString();

        const dolcePlayers = buildPlayersForAssignment(
            5,
            'dolceUserId',
            dolceUserOneId,
            dolceUserTwoId,
            'dolce'
        );
        const gabbanaPlayers = buildPlayersForAssignment(
            10,
            'gabbanaUserId',
            gabbanaUserOneId,
            gabbanaUserTwoId,
            'gabbana'
        );
        const playoffPlayers = buildPlayersForAssignment(
            15,
            'playoffUserId',
            playoffUserOneId,
            playoffUserTwoId,
            'playoff'
        );

        await PlayersModel.create([
            ...dolcePlayers,
            ...gabbanaPlayers,
            ...playoffPlayers
        ]);

        const dolceUserOnePlayers = await PlayersModel.getPlayersByUserId(
            dolceUserOneId,
            'dolce'
        );
        const dolceUserTwoPlayers = await PlayersModel.getPlayersByUserId(
            dolceUserTwoId,
            'dolce'
        );
        const gabbanaUserOnePlayers = await PlayersModel.getPlayersByUserId(
            gabbanaUserOneId,
            'gabbana'
        );
        const gabbanaUserTwoPlayers = await PlayersModel.getPlayersByUserId(
            gabbanaUserTwoId,
            'gabbana'
        );
        const playoffUserOnePlayers = await PlayersModel.getPlayersByUserId(
            playoffUserOneId,
            'playoff'
        );
        const playoffUserTwoPlayers = await PlayersModel.getPlayersByUserId(
            playoffUserTwoId,
            'playoff'
        );

        expect(dolceUserOnePlayers).toHaveLength(3);
        expect(dolceUserTwoPlayers).toHaveLength(2);
        expect(gabbanaUserOnePlayers).toHaveLength(5);
        expect(gabbanaUserTwoPlayers).toHaveLength(5);
        expect(playoffUserOnePlayers).toHaveLength(8);
        expect(playoffUserTwoPlayers).toHaveLength(7);
    });
});
