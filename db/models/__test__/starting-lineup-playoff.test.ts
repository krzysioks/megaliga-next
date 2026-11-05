import type { PlayerPositionsAndRolesType } from '@/db/models/schema.types';

import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import StartingLineupPlayoffModel from '@/db/models/games/starting-lineup-playoff';
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
    overrides: Partial<PlayerPositionsAndRolesType> = {}
): PlayerPositionsAndRolesType => {
    const positions = {
        playerOne: new mongoose.Types.ObjectId().toString(),
        playerTwo: new mongoose.Types.ObjectId().toString(),
        playerThree: new mongoose.Types.ObjectId().toString(),
        playerFour: new mongoose.Types.ObjectId().toString(),
        playerFive: new mongoose.Types.ObjectId().toString(),
        ...overrides
    };
    return {
        ...positions,
        roles: overrides.roles ?? {
            pn: { playerId: positions.playerOne, isDisabled: false },
            kb: positions.playerTwo,
            p: positions.playerThree
        }
    };
};

const createPlayerPositions = async () => {
    const players = await PlayersModel.create([
        { extraligaPlayerName: 'Player One' },
        { extraligaPlayerName: 'Player Two' },
        { extraligaPlayerName: 'Player Three' },
        { extraligaPlayerName: 'Player Four' },
        { extraligaPlayerName: 'Player Five' }
    ]);

    return createPositions({
        playerOne: players[0]._id.toString(),
        playerTwo: players[1]._id.toString(),
        playerThree: players[2]._id.toString(),
        playerFour: players[3]._id.toString(),
        playerFive: players[4]._id.toString()
    });
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
    describe('getUserStartingLineupByRound', () => {
        test('Should return null when playoff starting lineup does not exist for given userId or roundNumber', async () => {
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
    });

    describe('setPlayersPosition', () => {
        test('Should reject assigning one playoff rider to multiple roles without creating a starting lineup', async () => {
            const user = await UserModel.create(createUserData());
            const data = createPositions();
            data.roles.kb = data.roles.pn.playerId;

            await expect(
                StartingLineupPlayoffModel.setPlayersPosition(
                    data,
                    user._id.toString(),
                    1
                )
            ).rejects.toThrow('A player can have only one role');

            expect(
                await StartingLineupPlayoffModel.getUserStartingLineupByRound(
                    user._id.toString(),
                    1
                )
            ).toBeNull();
        });

        test('Should not add playoff starting lineup when userId is invalid', async () => {
            const invalidUserId = new mongoose.Types.ObjectId().toString();

            await expect(
                StartingLineupPlayoffModel.setPlayersPosition(
                    createPositions(),
                    invalidUserId,
                    1
                )
            ).rejects.toThrow(`Invalid userId: ${invalidUserId}`);

            expect(await StartingLineupPlayoffModel.countDocuments()).toBe(0);
        });

        test('Should not add playoff starting lineup when positions payload has forbidden keys', async () => {
            const user = await new UserModel(createUserData()).save();
            const userId = user._id.toString();
            const invalidPositions = {
                ...createPositions(),
                forbiddenKey: new mongoose.Types.ObjectId().toString()
            } as unknown as PlayerPositionsAndRolesType;

            await expect(
                StartingLineupPlayoffModel.setPlayersPosition(
                    invalidPositions,
                    userId,
                    1
                )
            ).rejects.toThrow(
                'Invalid positions payload. Allowed fields: playerOne, playerTwo, playerThree, playerFour, playerFive, roles.'
            );

            expect(await StartingLineupPlayoffModel.countDocuments()).toBe(0);
        });

        test('Should not add playoff starting lineup when document for userId and roundNumber already exists', async () => {
            const user = await new UserModel(createUserData()).save();
            const userId = user._id.toString();
            const roundNumber = 2;

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
            ).rejects.toThrow(
                `Playoff starting lineup already exists for userId: ${userId} and roundNumber: ${roundNumber}`
            );

            expect(
                await StartingLineupPlayoffModel.countDocuments({
                    userId,
                    roundNumber
                })
            ).toBe(1);
        });

        test('Should save all roles and keep PN enabled when creating a playoff starting lineup', async () => {
            const user = await UserModel.create(createUserData());
            const positions = createPositions();
            const data = {
                ...positions,
                roles: {
                    pn: { playerId: positions.playerOne, isDisabled: true },
                    kb: positions.playerTwo,
                    p: positions.playerThree
                }
            };

            await StartingLineupPlayoffModel.setPlayersPosition(
                data,
                user._id.toString(),
                1
            );

            const savedLineup =
                await StartingLineupPlayoffModel.getUserStartingLineupByRound(
                    user._id.toString(),
                    1
                );
            expect(
                savedLineup.toObject({ flattenObjectIds: true })
            ).toMatchObject({
                ...data,
                roles: {
                    pn: { playerId: positions.playerOne, isDisabled: false },
                    kb: positions.playerTwo,
                    p: positions.playerThree
                }
            });
        });
    });

    describe('updatePlayersPosition', () => {
        test('Should reject assigning one playoff rider to multiple roles without changing the starting lineup', async () => {
            const user = await UserModel.create(createUserData());
            const data = createPositions();
            await StartingLineupPlayoffModel.setPlayersPosition(data, user._id.toString(), 1);
            const lineup =
                await StartingLineupPlayoffModel.getUserStartingLineupByRound(
                    user._id.toString(),
                    1
                );
            const updatedData = createPositions();
            updatedData.roles.p = updatedData.roles.kb;

            await expect(
                lineup.updatePlayersPosition(updatedData)
            ).rejects.toThrow('A player can have only one role');

            const savedLineup =
                await StartingLineupPlayoffModel.getUserStartingLineupByRound(
                    user._id.toString(),
                    1
                );
            expect(
                savedLineup.toObject({ flattenObjectIds: true })
            ).toMatchObject(data);
        });

        test('Should not update playoff starting lineup document when positions payload has forbidden keys', async () => {
            const user = await new UserModel(createUserData()).save();
            const userId = user._id.toString();
            const initialPositions = createPositions();

            const lineup = await new StartingLineupPlayoffModel({
                userId,
                roundNumber: 1,
                ...initialPositions
            }).save();
            const invalidPositions = {
                ...createPositions(),
                forbiddenKey: new mongoose.Types.ObjectId().toString()
            } as unknown as PlayerPositionsAndRolesType;

            await expect(
                lineup.updatePlayersPosition(invalidPositions)
            ).rejects.toThrow(
                'Invalid positions payload. Allowed fields: playerOne, playerTwo, playerThree, playerFour, playerFive, roles.'
            );

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

        test('Should update playoff positions and roles while preserving the admin PN disable flag', async () => {
            const user = await UserModel.create(createUserData());
            const userId = user._id.toString();
            const data = createPositions();
            await StartingLineupPlayoffModel.setPlayersPosition(data, userId, 1);
            const lineup =
                await StartingLineupPlayoffModel.getUserStartingLineupByRound(
                    userId,
                    1
                );
            lineup.set('roles.pn.isDisabled', true);
            await lineup.save();
            const updatedData = createPositions({
                playerOne: data.playerFour,
                playerTwo: data.playerTwo,
                playerThree: data.playerThree,
                playerFour: data.playerOne,
                playerFive: data.playerFive
            });

            await lineup.updatePlayersPosition(updatedData);

            const savedLineup =
                await StartingLineupPlayoffModel.getUserStartingLineupByRound(
                    userId,
                    1
                );
            expect(
                savedLineup.toObject({ flattenObjectIds: true })
            ).toMatchObject({
                ...updatedData,
                roles: {
                    ...updatedData.roles,
                    pn: {
                        playerId: updatedData.roles.pn.playerId,
                        isDisabled: true
                    }
                }
            });
        });

        test('Should keep PN enabled when updating playoff positions and roles', async () => {
            const user = await new UserModel(createUserData()).save();
            const userId = user._id.toString();
            const initialPositions = createPositions();
            const updatedPositions = createPositions();
            updatedPositions.roles.pn.isDisabled = true;

            const lineup = await new StartingLineupPlayoffModel({
                userId,
                roundNumber: 1,
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
            expect(refreshed?.toObject({ flattenObjectIds: true }).roles).toEqual({
                ...updatedPositions.roles,
                pn: {
                    playerId: updatedPositions.roles.pn.playerId,
                    isDisabled: false
                }
            });
        });
    });

    describe('getPrimusNominatusForAdmin', () => {
        test.each([0, 5])(
            'Should throw for playoff PN round %i outside 1 - 4',
            async roundNumber => {
                await expect(
                    StartingLineupPlayoffModel.getPrimusNominatusForAdmin(
                        roundNumber,
                        new mongoose.Types.ObjectId().toString()
                    )
                ).rejects.toThrow(
                    `Invalid roundNumber: ${roundNumber}. Must be between 1 and 4`
                );
            }
        );

        test('Should throw for a nonexistent playoff PN user', async () => {
            const userId = new mongoose.Types.ObjectId().toString();
            await expect(
                StartingLineupPlayoffModel.getPrimusNominatusForAdmin(
                    1,
                    userId
                )
            ).rejects.toThrow(
                `Invalid userId: ${userId}`
            );
        });

        test('Should return null when the playoff starting lineup does not exist', async () => {
            const user = await UserModel.create(createUserData());
            expect(
                await StartingLineupPlayoffModel.getPrimusNominatusForAdmin(
                    1,
                    user._id.toString()
                )
            ).toBeNull();
        });

        test.each([1, 4])(
            'Should return the assigned playoff PN rider and enabled default for boundary round %i',
            async roundNumber => {
                const user = await UserModel.create(createUserData());
                const data = createPositions();
                await StartingLineupPlayoffModel.create({
                    ...data,
                    userId: user._id,
                    roundNumber,
                    roles: {
                        ...data.roles,
                        pn: { playerId: data.roles.pn.playerId }
                    }
                });

                expect(
                    await StartingLineupPlayoffModel.getPrimusNominatusForAdmin(
                        roundNumber,
                        user._id.toString()
                    )
                ).toEqual({
                    playerId: data.roles.pn.playerId,
                    isDisabled: false
                });
            }
        );
    });

    describe('savePrimusNominatusForAdmin', () => {
        test.each([0, 5])(
            'Should throw for playoff PN save round %i outside 1 - 4',
            async roundNumber => {
                await expect(
                    StartingLineupPlayoffModel.savePrimusNominatusForAdmin(
                        roundNumber,
                        new mongoose.Types.ObjectId().toString(),
                        true
                    )
                ).rejects.toThrow(
                    `Invalid roundNumber: ${roundNumber}. Must be between 1 and 4`
                );
            }
        );

        test('Should throw for a nonexistent playoff PN save user', async () => {
            const userId = new mongoose.Types.ObjectId().toString();
            await expect(
                StartingLineupPlayoffModel.savePrimusNominatusForAdmin(
                    1,
                    userId,
                    true
                )
            ).rejects.toThrow(
                `Invalid userId: ${userId}`
            );
        });

        test('Should throw when saving playoff PN without a starting lineup', async () => {
            const user = await UserModel.create(createUserData());
            await expect(
                StartingLineupPlayoffModel.savePrimusNominatusForAdmin(
                    1,
                    user._id.toString(),
                    true
                )
            ).rejects.toThrow(
                'No starting lineup for user and round'
            );
        });

        test('Should reject a nonboolean playoff PN flag without changing the saved value', async () => {
            const user = await UserModel.create(createUserData());
            const userId = user._id.toString();
            const data = createPositions();
            await StartingLineupPlayoffModel.setPlayersPosition(data, userId, 1);

            await expect(
                StartingLineupPlayoffModel.savePrimusNominatusForAdmin(
                    1,
                    userId,
                    'disabled' as unknown as boolean
                )
            ).rejects.toThrow('Expected boolean, received string');

            expect(
                await StartingLineupPlayoffModel.getPrimusNominatusForAdmin(
                    1,
                    userId
                )
            ).toEqual({ playerId: data.roles.pn.playerId, isDisabled: false });
        });

        test('Should disable and reenable PN only for the requested playoff user and round', async () => {
            const [user, otherUser] = await UserModel.create([
                createUserData(),
                createUserData({
                    username: 'user-two',
                    email: 'user-two@example.com'
                })
            ]);
            const userId = user._id.toString();
            const otherUserId = otherUser._id.toString();
            const data = createPositions();
            await StartingLineupPlayoffModel.setPlayersPosition(data, otherUserId, 1);
            await StartingLineupPlayoffModel.setPlayersPosition(data, userId, 4);
            await StartingLineupPlayoffModel.setPlayersPosition(data, userId, 1);

            await StartingLineupPlayoffModel.savePrimusNominatusForAdmin(1, userId, true);

            expect(
                await StartingLineupPlayoffModel.getPrimusNominatusForAdmin(
                    1,
                    userId
                )
            ).toEqual({
                playerId: data.roles.pn.playerId,
                isDisabled: true
            });
            expect(
                await StartingLineupPlayoffModel.getPrimusNominatusForAdmin(
                    4,
                    userId
                )
            ).toEqual({
                playerId: data.roles.pn.playerId,
                isDisabled: false
            });
            expect(
                await StartingLineupPlayoffModel.getPrimusNominatusForAdmin(
                    1,
                    otherUserId
                )
            ).toEqual({
                playerId: data.roles.pn.playerId,
                isDisabled: false
            });
            const savedLineup =
                await StartingLineupPlayoffModel.getUserStartingLineupByRound(
                    userId,
                    1
                );
            expect(
                savedLineup.toObject({ flattenObjectIds: true })
            ).toMatchObject({
                ...data,
                roles: {
                    ...data.roles,
                    pn: { playerId: data.roles.pn.playerId, isDisabled: true }
                }
            });

            await StartingLineupPlayoffModel.savePrimusNominatusForAdmin(1, userId, false);

            expect(
                await StartingLineupPlayoffModel.getPrimusNominatusForAdmin(
                    1,
                    userId
                )
            ).toEqual({
                playerId: data.roles.pn.playerId,
                isDisabled: false
            });
        });
    });

    describe('deleteAll', () => {
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
