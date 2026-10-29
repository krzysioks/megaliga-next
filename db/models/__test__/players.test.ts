import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import PlayersModel, { PlayersType } from '@/db/models/players';
import UserModel, { UserType } from '@/db/models/user';

type PlayerAssignmentType = 'dolce' | 'gabbana' | 'playoff';

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
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test clear collection
beforeEach(async () => {
    await PlayersModel.deleteMany();
    await UserModel.deleteMany();
});

// close connection to server so that test suite will close
afterAll(async () => {
    await PlayersModel.deleteMany();
    await UserModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test PlayersModel methods and static functions', () => {
    describe('getPlayersByUserId', () => {
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
                        isJunior: index === 0,
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
            expect(
                Object.fromEntries(
                    dolceUserOnePlayers.map(player => {
                        return [player.extraligaPlayerName, player.isJunior];
                    })
                )
            ).toEqual({
                'dolce-player-1': true,
                'dolce-player-3': false,
                'dolce-player-5': false
            });

            expect(
                dolceUserOnePlayers.every(
                    player => typeof player.playerId === 'string'
                )
            ).toBe(true);
        });
    }); // getPlayersByUserId

    describe('getAvailablePlayersByAssignmentType', () => {
        it('Should return only players with null assignment field for each assignment type', async () => {
            await PlayersModel.create([
                createPlayerData({
                    extraligaPlayerName: 'dolce-available-1',
                    isJunior: true,
                    dolceUserId: null as unknown as string
                }),
                createPlayerData({
                    extraligaPlayerName: 'dolce-available-2',
                    dolceUserId: null as unknown as string
                }),
                createPlayerData({
                    extraligaPlayerName: 'dolce-assigned',
                    dolceUserId: new mongoose.Types.ObjectId().toString()
                }),
                createPlayerData({
                    extraligaPlayerName: 'gabbana-available-1',
                    gabbanaUserId: null as unknown as string
                }),
                createPlayerData({
                    extraligaPlayerName: 'gabbana-available-2',
                    gabbanaUserId: null as unknown as string
                }),
                createPlayerData({
                    extraligaPlayerName: 'gabbana-assigned',
                    gabbanaUserId: new mongoose.Types.ObjectId().toString()
                }),
                createPlayerData({
                    extraligaPlayerName: 'playoff-available-1',
                    playoffUserId: null as unknown as string
                }),
                createPlayerData({
                    extraligaPlayerName: 'playoff-available-2',
                    playoffUserId: null as unknown as string
                }),
                createPlayerData({
                    extraligaPlayerName: 'playoff-assigned',
                    playoffUserId: new mongoose.Types.ObjectId().toString()
                })
            ]);

            const dolceAvailable =
                await PlayersModel.getAvailablePlayersByAssignmentType('dolce');
            const gabbanaAvailable =
                await PlayersModel.getAvailablePlayersByAssignmentType(
                    'gabbana'
                );
            const playoffAvailable =
                await PlayersModel.getAvailablePlayersByAssignmentType(
                    'playoff'
                );

            expect(
                dolceAvailable.map(player => player.extraligaPlayerName).sort()
            ).toEqual(['dolce-available-1', 'dolce-available-2']);
            expect(
                dolceAvailable.find(
                    player => player.extraligaPlayerName === 'dolce-available-1'
                )?.isJunior
            ).toBe(true);
            expect(
                dolceAvailable.find(
                    player => player.extraligaPlayerName === 'dolce-available-2'
                )?.isJunior
            ).toBe(false);
            expect(
                gabbanaAvailable
                    .map(player => player.extraligaPlayerName)
                    .sort()
            ).toEqual(['gabbana-available-1', 'gabbana-available-2']);
            expect(
                playoffAvailable
                    .map(player => player.extraligaPlayerName)
                    .sort()
            ).toEqual(['playoff-available-1', 'playoff-available-2']);

            expect(
                dolceAvailable.every(player => player.dolceUserId === null)
            ).toBe(true);
            expect(
                gabbanaAvailable.every(player => player.gabbanaUserId === null)
            ).toBe(true);
            expect(
                playoffAvailable.every(player => player.playoffUserId === null)
            ).toBe(true);

            expect(
                dolceAvailable.every(
                    player => typeof player.playerId === 'string'
                )
            ).toBe(true);
        });
    }); // getAvailablePlayersByAssignmentType

    describe('draftPlayer', () => {
        it('Should catch invalid data (invalid assignment type and non existing userId)', async () => {
            const player = await new PlayersModel(createPlayerData()).save();

            await expect(
                player.draftPlayer(
                    new mongoose.Types.ObjectId().toString(),
                    'invalid' as unknown as PlayerAssignmentType
                )
            ).rejects.toThrow('Invalid player assignment type');

            await expect(
                player.draftPlayer(
                    new mongoose.Types.ObjectId().toString(),
                    'dolce'
                )
            ).rejects.toThrow('Invalid userId');
        });

        it('Should set userId to given assignment type', async () => {
            const dolceUser = await new UserModel(
                createUserData({
                    username: 'dolce-user',
                    email: 'dolce-user@example.com'
                })
            ).save();
            const gabbanaUser = await new UserModel(
                createUserData({
                    username: 'gabbana-user',
                    email: 'gabbana-user@example.com'
                })
            ).save();
            const playoffUser = await new UserModel(
                createUserData({
                    username: 'playoff-user',
                    email: 'playoff-user@example.com'
                })
            ).save();

            const dolcePlayer = await new PlayersModel(
                createPlayerData({
                    extraligaPlayerName: 'draft-dolce-player',
                    dolceUserId: null as unknown as string
                })
            ).save();
            const gabbanaPlayer = await new PlayersModel(
                createPlayerData({
                    extraligaPlayerName: 'draft-gabbana-player',
                    gabbanaUserId: null as unknown as string
                })
            ).save();
            const playoffPlayer = await new PlayersModel(
                createPlayerData({
                    extraligaPlayerName: 'draft-playoff-player',
                    playoffUserId: null as unknown as string
                })
            ).save();

            await dolcePlayer.draftPlayer(dolceUser._id.toString(), 'dolce');
            await gabbanaPlayer.draftPlayer(
                gabbanaUser._id.toString(),
                'gabbana'
            );
            await playoffPlayer.draftPlayer(
                playoffUser._id.toString(),
                'playoff'
            );

            const updatedDolcePlayer = await PlayersModel.findById(
                dolcePlayer._id
            ).exec();
            const updatedGabbanaPlayer = await PlayersModel.findById(
                gabbanaPlayer._id
            ).exec();
            const updatedPlayoffPlayer = await PlayersModel.findById(
                playoffPlayer._id
            ).exec();

            expect(updatedDolcePlayer?.dolceUserId?.toString()).toBe(
                dolceUser._id.toString()
            );
            expect(updatedGabbanaPlayer?.gabbanaUserId?.toString()).toBe(
                gabbanaUser._id.toString()
            );
            expect(updatedPlayoffPlayer?.playoffUserId?.toString()).toBe(
                playoffUser._id.toString()
            );
        });
    }); // draftPlayer

    describe('resetPlayersAssignment', () => {
        it('Should clear assignment fields for all players', async () => {
            const players = await PlayersModel.create([
                createPlayerData({ extraligaPlayerName: 'Player One' }),
                createPlayerData({ extraligaPlayerName: 'Player Two' })
            ]);

            await PlayersModel.resetPlayersAssignment();

            const updatedPlayers = await PlayersModel.find({
                _id: { $in: players.map(player => player._id) }
            }).exec();

            expect(updatedPlayers).toHaveLength(2);
            updatedPlayers.forEach(player => {
                expect(player.dolceUserId).toBeNull();
                expect(player.gabbanaUserId).toBeNull();
                expect(player.playoffUserId).toBeNull();
                expect(player.draftedWithNumberDolce).toBeNull();
                expect(player.draftedWithNumberGabbana).toBeNull();
                expect(player.draftedWithNumberPlayoff).toBeNull();
            });
        });
    }); // resetPlayersAssignment

    describe('parsePlayers', () => {
        test('Should trim player names and skip empty entries without changing saved players', async () => {
            await PlayersModel.create([
                createPlayerData({ extraligaPlayerName: 'Existing Player' }),
                createPlayerData({
                    extraligaPlayerName: 'Inactive Player',
                    playerStatus: 'inactive'
                })
            ]);
            const before = await PlayersModel.find().lean().exec();

            expect(
                PlayersModel.parsePlayers(' Player One , , Player Two,  ')
            ).toEqual([
                { extraligaPlayerName: 'Player One', isJunior: false },
                { extraligaPlayerName: 'Player Two', isJunior: false }
            ]);
            expect(PlayersModel.parsePlayers('')).toEqual([]);
            expect(PlayersModel.parsePlayers(',  , ')).toEqual([]);
            expect(await PlayersModel.find().lean().exec()).toEqual(before);
        });
    });

    describe('importPlayers', () => {
        test('Should import reviewed junior and non-junior players as active', async () => {
            const reviewedPlayers = PlayersModel.parsePlayers(
                'Player One, Player Two, Player Three'
            );
            reviewedPlayers[0].isJunior = true;
            await PlayersModel.importPlayers(reviewedPlayers);

            const players = await PlayersModel.find().exec();

            expect(players).toHaveLength(3);
            expect(
                players.map(player => player.extraligaPlayerName).sort()
            ).toEqual(['Player One', 'Player Three', 'Player Two']);
            players.forEach(player => {
                expect(player.playerStatus).toBe('active');
            });
            expect(
                players.find(
                    player => player.extraligaPlayerName === 'Player One'
                )?.isJunior
            ).toBe(true);
            expect(
                players
                    .filter(
                        player => player.extraligaPlayerName !== 'Player One'
                    )
                    .every(player => player.isJunior === false)
            ).toBe(true);
        });

        test('Should update junior status without duplicating existing players or changing their assignments', async () => {
            const [playerOne, playerTwo] = await PlayersModel.create([
                createPlayerData({ extraligaPlayerName: 'Player One' }),
                createPlayerData({
                    extraligaPlayerName: 'Player Two',
                    isJunior: true,
                    playerStatus: 'inactive'
                })
            ]);

            await PlayersModel.importPlayers([
                { extraligaPlayerName: 'Player One', isJunior: true },
                { extraligaPlayerName: 'Player Two', isJunior: false },
                { extraligaPlayerName: 'Player Three', isJunior: false }
            ]);

            const players = await PlayersModel.find().exec();

            expect(players).toHaveLength(3);
            expect(
                players.map(player => player.extraligaPlayerName).sort()
            ).toEqual(['Player One', 'Player Three', 'Player Two']);
            expect(
                players
                    .find(player => player.extraligaPlayerName === 'Player One')
                    ?.toObject()
            ).toEqual({ ...playerOne.toObject(), isJunior: true });
            expect(
                players
                    .find(player => player.extraligaPlayerName === 'Player Two')
                    ?.toObject()
            ).toEqual({ ...playerTwo.toObject(), isJunior: false });
        });

        test('Should set playerStatus to inactive for players missing from the imported list', async () => {
            await PlayersModel.create([
                createPlayerData({ extraligaPlayerName: 'Player One' }),
                createPlayerData({ extraligaPlayerName: 'Player Two' })
            ]);

            await PlayersModel.importPlayers([
                { extraligaPlayerName: 'Player One', isJunior: false }
            ]);

            const playerOne = await PlayersModel.findOne({
                extraligaPlayerName: 'Player One'
            }).exec();
            const playerTwo = await PlayersModel.findOne({
                extraligaPlayerName: 'Player Two'
            }).exec();

            expect(playerOne?.playerStatus).toBe('active');
            expect(playerTwo?.playerStatus).toBe('inactive');
        });
    }); // importPlayers
});
