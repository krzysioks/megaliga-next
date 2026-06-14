import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import StartingLineupPlayoffModel, {
    PlayerPostions
} from '@/db/models/games/starting-lineup-playoff';
import UserModel, { UserType } from '@/db/models/user';

const createUserData = (overrides: Partial<UserType> = {}) => ({
    username: 'user-one',
    coachName: 'Coach One',
    email: 'user-one@example.com',
    password: 'Password1!',
    teamName: 'Team One',
    logoUrl: 'https://example.com/team-one.png',
    reachedPlayoff: false,
    isFirstRoundDraftOrderDraw: false,
    groupName: new mongoose.Types.ObjectId().toString(),
    bio: 'User one bio',
    cabinetTrophy: [],
    isAdmin: false,
    ...overrides
});

const createPositions = (
    overrides: Partial<PlayerPostions> = {}
): PlayerPostions => ({
    playerOne: new mongoose.Types.ObjectId().toString(),
    playerTwo: new mongoose.Types.ObjectId().toString(),
    playerThree: new mongoose.Types.ObjectId().toString(),
    playerFour: new mongoose.Types.ObjectId().toString(),
    playerFive: new mongoose.Types.ObjectId().toString(),
    ...overrides
});

// connect to test db before running tests
beforeAll(async () => {
    // Mock console.error to silence logs during testing
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test clear collections
beforeEach(async () => {
    await StartingLineupPlayoffModel.deleteMany();
    await UserModel.deleteMany();
});

// close connection to server so that test suite will close
afterAll(async () => {
    await StartingLineupPlayoffModel.deleteMany();
    await UserModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test StartingLineupPlayoffModel methods and static functions', () => {
    test('Should return playoff starting lineup for given userId and roundNumber', async () => {
        const user = await new UserModel(createUserData()).save();
        const userId = user._id.toString();
        const roundNumber = 3;
        const positions = createPositions();

        await new StartingLineupPlayoffModel({
            userId,
            roundNumber,
            ...positions
        }).save();

        const lineup =
            await StartingLineupPlayoffModel.getUserStartingLineupByRound(
                userId,
                roundNumber
            );

        expect(lineup).not.toBeNull();
        expect(lineup?.userId?.toString()).toBe(userId);
        expect(lineup?.roundNumber).toBe(roundNumber);
        expect(lineup?.playerOne?.toString()).toBe(positions.playerOne);
        expect(lineup?.playerTwo?.toString()).toBe(positions.playerTwo);
        expect(lineup?.playerThree?.toString()).toBe(positions.playerThree);
        expect(lineup?.playerFour?.toString()).toBe(positions.playerFour);
        expect(lineup?.playerFive?.toString()).toBe(positions.playerFive);
    });

    test('Should return null when playoff lineup does not exist for given userId or roundNumber', async () => {
        const user = await new UserModel(createUserData()).save();
        const userId = user._id.toString();
        const positions = createPositions();

        await new StartingLineupPlayoffModel({
            userId,
            roundNumber: 1,
            ...positions
        }).save();

        const missingByRound =
            await StartingLineupPlayoffModel.getUserStartingLineupByRound(
                userId,
                2
            );
        const missingByUser =
            await StartingLineupPlayoffModel.getUserStartingLineupByRound(
                new mongoose.Types.ObjectId().toString(),
                1
            );

        expect(missingByRound).toBeNull();
        expect(missingByUser).toBeNull();
    });

    test('Should add new playoff starting lineup document', async () => {
        const user = await new UserModel(createUserData()).save();
        const userId = user._id.toString();
        const roundNumber = 7;
        const positions = createPositions();

        await StartingLineupPlayoffModel.setPlayersPosition(
            positions,
            userId,
            roundNumber
        );

        const savedLineup = await StartingLineupPlayoffModel.findOne({
            userId,
            roundNumber
        }).exec();

        expect(savedLineup).not.toBeNull();
        expect(savedLineup?.userId?.toString()).toBe(userId);
        expect(savedLineup?.roundNumber).toBe(roundNumber);
        expect(savedLineup?.playerOne?.toString()).toBe(positions.playerOne);
        expect(savedLineup?.playerTwo?.toString()).toBe(positions.playerTwo);
        expect(savedLineup?.playerThree?.toString()).toBe(
            positions.playerThree
        );
        expect(savedLineup?.playerFour?.toString()).toBe(positions.playerFour);
        expect(savedLineup?.playerFive?.toString()).toBe(positions.playerFive);
    });

    test('Should not add playoff lineup when userId is invalid', async () => {
        const invalidUserId = new mongoose.Types.ObjectId().toString();

        await expect(
            StartingLineupPlayoffModel.setPlayersPosition(
                createPositions(),
                invalidUserId,
                8
            )
        ).rejects.toThrow(`Invalid userId: ${invalidUserId}`);

        expect(await StartingLineupPlayoffModel.countDocuments()).toBe(0);
    });

    test('Should not add playoff lineup when positions payload has forbidden keys', async () => {
        const user = await new UserModel(createUserData()).save();
        const userId = user._id.toString();
        const invalidPositions = {
            ...createPositions(),
            forbiddenKey: new mongoose.Types.ObjectId().toString()
        } as unknown as PlayerPostions;

        await expect(
            StartingLineupPlayoffModel.setPlayersPosition(
                invalidPositions,
                userId,
                9
            )
        ).rejects.toThrow('Invalid positions payload');

        expect(await StartingLineupPlayoffModel.countDocuments()).toBe(0);
    });

    test('Should not add playoff lineup when document for userId and roundNumber already exists', async () => {
        const user = await new UserModel(createUserData()).save();
        const userId = user._id.toString();
        const roundNumber = 10;

        await new StartingLineupPlayoffModel({
            userId,
            roundNumber,
            ...createPositions()
        }).save();

        await expect(
            StartingLineupPlayoffModel.setPlayersPosition(
                createPositions(),
                userId,
                roundNumber
            )
        ).rejects.toThrow('Playoff starting lineup already exists');

        expect(
            await StartingLineupPlayoffModel.countDocuments({
                userId,
                roundNumber
            })
        ).toBe(1);
    });

    test('Should update playoff lineup document when positions payload is valid', async () => {
        const user = await new UserModel(createUserData()).save();
        const userId = user._id.toString();
        const initialPositions = createPositions();
        const updatedPositions = createPositions();

        const lineup = await new StartingLineupPlayoffModel({
            userId,
            roundNumber: 11,
            ...initialPositions
        }).save();

        await lineup.updatePlayersPosition(updatedPositions);

        const refreshed = await StartingLineupPlayoffModel.findById(
            lineup._id
        ).exec();

        expect(refreshed).not.toBeNull();
        expect(refreshed?.playerOne?.toString()).toBe(
            updatedPositions.playerOne
        );
        expect(refreshed?.playerTwo?.toString()).toBe(
            updatedPositions.playerTwo
        );
        expect(refreshed?.playerThree?.toString()).toBe(
            updatedPositions.playerThree
        );
        expect(refreshed?.playerFour?.toString()).toBe(
            updatedPositions.playerFour
        );
        expect(refreshed?.playerFive?.toString()).toBe(
            updatedPositions.playerFive
        );
    });

    test('Should not update playoff lineup document when positions payload has forbidden keys', async () => {
        const user = await new UserModel(createUserData()).save();
        const userId = user._id.toString();
        const initialPositions = createPositions();

        const lineup = await new StartingLineupPlayoffModel({
            userId,
            roundNumber: 12,
            ...initialPositions
        }).save();
        const invalidPositions = {
            ...createPositions(),
            forbiddenKey: new mongoose.Types.ObjectId().toString()
        } as unknown as PlayerPostions;

        await expect(
            lineup.updatePlayersPosition(invalidPositions)
        ).rejects.toThrow('Invalid positions payload');

        const refreshed = await StartingLineupPlayoffModel.findById(
            lineup._id
        ).exec();

        expect(refreshed?.playerOne?.toString()).toBe(
            initialPositions.playerOne
        );
        expect(refreshed?.playerTwo?.toString()).toBe(
            initialPositions.playerTwo
        );
        expect(refreshed?.playerThree?.toString()).toBe(
            initialPositions.playerThree
        );
        expect(refreshed?.playerFour?.toString()).toBe(
            initialPositions.playerFour
        );
        expect(refreshed?.playerFive?.toString()).toBe(
            initialPositions.playerFive
        );
    });
});
