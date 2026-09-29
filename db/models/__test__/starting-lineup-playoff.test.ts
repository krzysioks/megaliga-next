import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import StartingLineupPlayoffModel, {
    PlayerPostions
} from '@/db/models/games/starting-lineup-playoff';
import PlayersModel from '@/db/models/players';
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

const createPlayerPositions = async (): Promise<PlayerPostions> => {
    const players = await PlayersModel.create([
        { extraligaPlayerName: 'Player One' },
        { extraligaPlayerName: 'Player Two' },
        { extraligaPlayerName: 'Player Three' },
        { extraligaPlayerName: 'Player Four' },
        { extraligaPlayerName: 'Player Five' }
    ]);

    return {
        playerOne: players[0]._id.toString(),
        playerTwo: players[1]._id.toString(),
        playerThree: players[2]._id.toString(),
        playerFour: players[3]._id.toString(),
        playerFive: players[4]._id.toString()
    };
};

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
    await PlayersModel.deleteMany();
});

// close connection to server so that test suite will close
afterAll(async () => {
    await StartingLineupPlayoffModel.deleteMany();
    await UserModel.deleteMany();
    await PlayersModel.deleteMany();
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

    test('Should remove all documents from the collection when deleteAll is called', async () => {
        const user = await new UserModel(createUserData()).save();

        await new StartingLineupPlayoffModel({
            userId: user._id.toString(),
            roundNumber: 1,
            ...createPositions()
        }).save();

        await StartingLineupPlayoffModel.deleteAll();

        const remainingDocuments =
            await StartingLineupPlayoffModel.find().exec();

        expect(remainingDocuments).toHaveLength(0);
    });

    describe('getStartingLineupPlayersByRound', () => {
        test('Should throw error if number of documents for given round < 4 - not all users entered starting lineup', async () => {
            const roundNumber = 1;
            const user = await new UserModel(createUserData()).save();
            const positions = await createPlayerPositions();

            await new StartingLineupPlayoffModel({
                userId: user._id.toString(),
                roundNumber,
                ...positions
            }).save();

            await expect(
                StartingLineupPlayoffModel.getStartingLineupPlayersByRound(
                    roundNumber
                )
            ).rejects.toThrow(
                `Expected 4 starting lineups for round ${roundNumber}, but found 1.`
            );
        });

        test('Should properly return array of objects with player id, userId, startingLineupId and playerName if all starting lineups provided', async () => {
            const roundNumber = 2;
            const numberOfUsers = 4;
            const userIds: string[] = [];
            const startingLineupIdByUserId: Record<string, string> = {};

            for (let i = 0; i < numberOfUsers; i++) {
                const user = await new UserModel(
                    createUserData({
                        username: `user-${i}`,
                        email: `user-${i}@example.com`
                    })
                ).save();
                const userId = user._id.toString();
                userIds.push(userId);
                const positions = await createPlayerPositions();

                const lineup = await new StartingLineupPlayoffModel({
                    userId,
                    roundNumber,
                    ...positions
                }).save();
                startingLineupIdByUserId[userId] = lineup._id.toString();
            }

            const result =
                await StartingLineupPlayoffModel.getStartingLineupPlayersByRound(
                    roundNumber
                );

            expect(result).toHaveLength(numberOfUsers * 5);
            result.forEach(player => {
                expect(player).toEqual(
                    expect.objectContaining({
                        userId: expect.any(Array),
                        startingLineupId: expect.any(Array),
                        playerId: expect.any(String),
                        playerName: expect.any(String)
                    })
                );
                expect(player.userId).toHaveLength(1);
                expect(player.startingLineupId).toHaveLength(1);
                expect(userIds).toContain(player.userId[0]);
                expect(player.startingLineupId[0]).toBe(
                    startingLineupIdByUserId[player.userId[0]]
                );
            });
        });

        test('Should aggregate userId and startingLineupId for a player assigned to more than one starting lineup', async () => {
            const roundNumber = 3;
            const numberOfUsers = 4;

            const userOne = await new UserModel(
                createUserData({
                    username: 'user-0',
                    email: 'user-0@example.com'
                })
            ).save();
            const positionsOne = await createPlayerPositions();
            const lineupOne = await new StartingLineupPlayoffModel({
                userId: userOne._id.toString(),
                roundNumber,
                ...positionsOne
            }).save();

            const userTwo = await new UserModel(
                createUserData({
                    username: 'user-1',
                    email: 'user-1@example.com'
                })
            ).save();
            const positionsTwo = {
                ...(await createPlayerPositions()),
                playerOne: positionsOne.playerOne
            };
            const lineupTwo = await new StartingLineupPlayoffModel({
                userId: userTwo._id.toString(),
                roundNumber,
                ...positionsTwo
            }).save();

            for (let i = 2; i < numberOfUsers; i++) {
                const user = await new UserModel(
                    createUserData({
                        username: `user-${i}`,
                        email: `user-${i}@example.com`
                    })
                ).save();
                const positions = await createPlayerPositions();

                await new StartingLineupPlayoffModel({
                    userId: user._id.toString(),
                    roundNumber,
                    ...positions
                }).save();
            }

            const result =
                await StartingLineupPlayoffModel.getStartingLineupPlayersByRound(
                    roundNumber
                );

            expect(result).toHaveLength(numberOfUsers * 5 - 1);

            const sharedPlayer = result.find(
                player => player.playerId === positionsOne.playerOne
            );

            expect(sharedPlayer?.userId).toEqual(
                expect.arrayContaining([
                    userOne._id.toString(),
                    userTwo._id.toString()
                ])
            );
            expect(sharedPlayer?.startingLineupId).toEqual(
                expect.arrayContaining([
                    lineupOne._id.toString(),
                    lineupTwo._id.toString()
                ])
            );
        });
    });
});
