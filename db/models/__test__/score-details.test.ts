import type {
    TeamCalculationDetailsType,
    PlayerScoresType
} from '@/db/models/schema.types';

import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import { STARTING_LINEUP_PLAYER_COUNT } from '@/db/db.constants';
import ScheduleModel from '@/db/models/games/schedule';
import ScoreDetailsModel, {
    scoreDetailsZodSchema,
    ScoreDetailsReturnType,
    ScoreDetailsInputType
} from '@/db/models/games/score-details';
import SetPlaysDataModel from '@/db/models/games/set-plays-data';
import StartingLineupModel from '@/db/models/games/starting-lineup';
import PlayersModel from '@/db/models/players';
import { playerScoresZodSchema, SetPlayEnumType } from '@/db/models/schema.types';
import SeasonOpsModel from '@/db/models/season-ops';
import SetPlaysModel from '@/db/models/set-plays';
import UserModel, { UserType } from '@/db/models/user';

const playerHeat = (
    value: number | null,
    bonus = false,
    isNominated = false
) => ({ value, bonus, isNominated });

const expectPlayerHeat = (
    actual: PlayerScoresType['heatOne'] | undefined,
    expected: ReturnType<typeof playerHeat>
) => {
    expect(actual?.value).toBe(expected.value);
    expect(actual?.bonus).toBe(expected.bonus);
    expect(actual?.isNominated).toBe(expected.isNominated);
};

const createUserData = (index: number): UserType => ({
    username: `user-${index + 1}`,
    coachName: `Coach ${index + 1}`,
    email: `user-${index + 1}@example.com`,
    password: 'Password1!',
    teamName: `Team ${index + 1}`,
    logoUrl: `https://example.com/team-${index + 1}.png`,
    reachedPlayoff: false,
    isFirstRoundDraftOrderDraw: false,
    groupName: new mongoose.Types.ObjectId().toString(),
    bio: `User ${index + 1} bio`,
    cabinetTrophy: [],
    isAdmin: false
});

// connect to test db before running tests
beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test clear collections
beforeEach(async () => {
    await SeasonOpsModel.deleteMany();
    await SetPlaysDataModel.deleteMany();
    await SetPlaysModel.deleteMany();
    await ScoreDetailsModel.deleteMany();
    await ScheduleModel.deleteMany();
    await StartingLineupModel.deleteMany();
    await PlayersModel.deleteMany();
    await UserModel.deleteMany();
});

// close connection to server so that test suite will close
afterAll(async () => {
    await SeasonOpsModel.deleteMany();
    await SetPlaysDataModel.deleteMany();
    await SetPlaysModel.deleteMany();
    await ScoreDetailsModel.deleteMany();
    await ScheduleModel.deleteMany();
    await StartingLineupModel.deleteMany();
    await PlayersModel.deleteMany();
    await UserModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test ScoreDetailsModel methods and static functions', () => {
    describe('getScoreDetailsByScheduleAndRoundId', () => {
        test('Should throw error if invalid scheduleId is provided', async () => {
            const invalidScheduleId = new mongoose.Types.ObjectId().toString();

            await expect(
                ScoreDetailsModel.getScoreDetailsByScheduleAndRoundId(
                    invalidScheduleId,
                    1
                )
            ).rejects.toThrow(`Invalid scheduleId: ${invalidScheduleId}`);
        });

        test('Should throw error if score details document not found', async () => {
            const userOne = await new UserModel(createUserData(10)).save();
            const userTwo = await new UserModel(createUserData(11)).save();

            const schedule = await new ScheduleModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 4,
                ligueGroupsId: new mongoose.Types.ObjectId().toString(),
                userOneScore: 50,
                userTwoScore: 40
            }).save();

            const missingRoundNumber = 99;

            await expect(
                ScoreDetailsModel.getScoreDetailsByScheduleAndRoundId(
                    schedule._id.toString(),
                    missingRoundNumber
                )
            ).rejects.toThrow(
                `Score details for scheduleId: ${schedule._id.toString()} and roundNumber: ${missingRoundNumber} not found`
            );
        });

        test('Should return score details with all referenced data populated correctly', async () => {
            const userOne = await new UserModel(createUserData(0)).save();
            const userTwo = await new UserModel(createUserData(1)).save();

            const players = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' },
                { extraligaPlayerName: 'Player Two' },
                { extraligaPlayerName: 'Player Three' },
                { extraligaPlayerName: 'Player Four' },
                { extraligaPlayerName: 'Player Five' },
                { extraligaPlayerName: 'Player Six' },
                { extraligaPlayerName: 'Player Seven' },
                { extraligaPlayerName: 'Player Eight' },
                { extraligaPlayerName: 'Player Nine' },
                { extraligaPlayerName: 'Player Ten' }
            ]);

            const startingLineupOne = await new StartingLineupModel({
                userId: userOne._id.toString(),
                roundNumber: 3,
                playerOne: players[0]._id.toString(),
                playerTwo: players[1]._id.toString(),
                playerThree: players[2]._id.toString(),
                playerFour: players[3]._id.toString(),
                playerFive: players[4]._id.toString(),
                roles: {
                    pn: { playerId: players[0]._id.toString(), isDisabled: false },
                    kb: players[1]._id.toString(),
                    p: players[2]._id.toString()
                }
            }).save();

            const startingLineupTwo = await new StartingLineupModel({
                userId: userTwo._id.toString(),
                roundNumber: 3,
                playerOne: players[5]._id.toString(),
                playerTwo: players[6]._id.toString(),
                playerThree: players[7]._id.toString(),
                playerFour: players[8]._id.toString(),
                playerFive: players[9]._id.toString(),
                roles: {
                    pn: { playerId: players[5]._id.toString(), isDisabled: false },
                    kb: players[6]._id.toString(),
                    p: players[7]._id.toString()
                }
            }).save();

            const [gwarancjaStartow, spartacus, muchomor, ncd, ncd6, awatar] =
                await SetPlaysModel.create([
                    {
                        name: 'Gwarancja startów',
                        type: SetPlayEnumType.GwarancjaStartow
                    },
                    { name: 'Spartacus', type: SetPlayEnumType.Spartacus },
                    { name: 'Muchomor', type: SetPlayEnumType.Muchomor },
                    { name: 'NCD', type: SetPlayEnumType.Ncd },
                    { name: 'NCD6', type: SetPlayEnumType.Ncd6 },
                    { name: 'Awatar', type: SetPlayEnumType.Awatar }
                ]);
            await SetPlaysDataModel.create([
                {
                    startingLineupId: startingLineupOne._id,
                    setPlayList: [
                        {
                            setPlayId: gwarancjaStartow._id,
                            userData: { playerId: players[0]._id.toString() }
                        },
                        {
                            setPlayId: spartacus._id,
                            userData: {
                                ownPlayerId: players[1]._id.toString(),
                                opponentPlayerId: players[5]._id.toString()
                            },
                            adminData: { ownAverage: 2, opponentAverage: 1.5 }
                        },
                        {
                            setPlayId: ncd._id,
                            userData: { playerId: players[2]._id.toString() },
                            adminData: {
                                playerIdList: players.slice(5, 9).map(player => {
                                    return player._id.toString();
                                })
                            }
                        },
                        {
                            setPlayId: ncd6._id,
                            userData: { playerId: players[3]._id.toString() }
                        },
                        {
                            setPlayId: awatar._id,
                            userData: {
                                playerId: players[5]._id.toString(),
                                replacedPlayerId: players[4]._id.toString()
                            }
                        },
                        {
                            setPlayId: gwarancjaStartow._id,
                            userData: { playerId: players[4]._id.toString() }
                        }
                    ]
                },
                {
                    startingLineupId: startingLineupTwo._id,
                    setPlayList: [{ setPlayId: muchomor._id }]
                }
            ]);

            const schedule = await new ScheduleModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 3,
                ligueGroupsId: new mongoose.Types.ObjectId().toString(),
                userOneScore: 46,
                userTwoScore: 44
            }).save();

            const scoreDetailsToCreate: ScoreDetailsInputType = {
                scheduleId: schedule._id.toString(),
                roundNumber: 3,
                teamOne: {
                    userId: userOne._id.toString(),
                    players: [
                        {
                            playerId: players[0]._id.toString(),
                            heatOne: playerHeat(3),
                            heatTwo: playerHeat(2),
                            setPlay: 1,
                            comment: 'Solid ride'
                        },
                        {
                            playerId: players[1]._id.toString(),
                            heatOne: playerHeat(1),
                            heatTwo: playerHeat(3),
                            setPlay: 0,
                            comment: 'Good finish'
                        }
                    ],
                    trainer: {
                        heatOne: 1,
                        setPlay: 0,
                        comment: 'Trainer one'
                    },
                    startingLineupId: startingLineupOne._id.toString()
                },
                teamTwo: {
                    userId: userTwo._id.toString(),
                    players: [
                        {
                            playerId: players[2]._id.toString(),
                            heatOne: playerHeat(2),
                            heatTwo: playerHeat(3),
                            setPlay: 1,
                            comment: 'Strong start'
                        },
                        {
                            playerId: players[3]._id.toString(),
                            heatOne: playerHeat(0),
                            heatTwo: playerHeat(1),
                            setPlay: 0,
                            comment: 'Needs improvement'
                        }
                    ],
                    trainer: {
                        heatOne: 0,
                        setPlay: 1,
                        comment: 'Trainer two'
                    },
                    startingLineupId: startingLineupTwo._id.toString()
                }
            };

            await new ScoreDetailsModel(scoreDetailsToCreate).save();

            const result: ScoreDetailsReturnType =
                await ScoreDetailsModel.getScoreDetailsByScheduleAndRoundId(
                    schedule._id.toString(),
                    3
                );

            expect(result.roundNumber).toBe(3);
            expect(result.userOneScore).toBe(46);
            expect(result.userTwoScore).toBe(44);

            expect(result.teamOne.teamName).toBe(userOne.teamName);
            expect(result.teamTwo.teamName).toBe(userTwo.teamName);
            expect(result.teamOne).toMatchObject({
                roles: {
                    pn: { playerId: players[0]._id.toString(), isDisabled: false },
                    kb: players[1]._id.toString(),
                    p: players[2]._id.toString()
                },
                setPlayPlayers: expect.arrayContaining([
                    {
                        playerId: players[0]._id.toString(),
                        extraligaPlayerName: 'Player One'
                    },
                    {
                        playerId: players[1]._id.toString(),
                        extraligaPlayerName: 'Player Two'
                    },
                    {
                        playerId: players[2]._id.toString(),
                        extraligaPlayerName: 'Player Three'
                    },
                    {
                        playerId: players[3]._id.toString(),
                        extraligaPlayerName: 'Player Four'
                    },
                    {
                        playerId: players[4]._id.toString(),
                        extraligaPlayerName: 'Player Five'
                    },
                    {
                        playerId: players[5]._id.toString(),
                        extraligaPlayerName: 'Player Six'
                    }
                ])
            });

            expect(result.teamOne.setPlays).toEqual([
                {
                    name: 'Gwarancja startów',
                    type: SetPlayEnumType.GwarancjaStartow,
                    userData: { playerId: players[0]._id.toString() }
                },
                {
                    name: 'Spartacus',
                    type: SetPlayEnumType.Spartacus,
                    userData: {
                        ownPlayerId: players[1]._id.toString(),
                        opponentPlayerId: players[5]._id.toString()
                    }
                },
                {
                    name: 'NCD',
                    type: SetPlayEnumType.Ncd,
                    userData: { playerId: players[2]._id.toString() }
                },
                {
                    name: 'NCD6',
                    type: SetPlayEnumType.Ncd6,
                    userData: { playerId: players[3]._id.toString() }
                },
                {
                    name: 'Awatar',
                    type: SetPlayEnumType.Awatar,
                    userData: {
                        playerId: players[5]._id.toString(),
                        replacedPlayerId: players[4]._id.toString()
                    }
                },
                {
                    name: 'Gwarancja startów',
                    type: SetPlayEnumType.GwarancjaStartow,
                    userData: { playerId: players[4]._id.toString() }
                }
            ]);
            expect(result.teamTwo.setPlays).toEqual([
                {
                    name: 'Muchomor',
                    type: SetPlayEnumType.Muchomor,
                    userData: null
                }
            ]);
            expect(result.teamOne.setPlayDescriptions).toBe(
                'PN - Player One, KB - Player Two, P - Player Three, GS: Player One, Spartacus: Player Two vs Player Six, NCD: Player Three, NCD6: Player Four, Awatar: Player Six za Player Five, GS: Player Five'
            );
            expect(result.teamTwo.setPlayDescriptions).toBe(
                'PN - Player Six, KB - Player Seven, P - Player Eight, Muchomor:'
            );

            expect(result.teamOne.players).toHaveLength(2);
            expect(result.teamTwo.players).toHaveLength(2);

            expect(result.teamOne.players[0].extraligaPlayerName).toBe(
                'Player One'
            );
            expect(result.teamOne.players[1].extraligaPlayerName).toBe(
                'Player Two'
            );
            expect(result.teamTwo.players[0].extraligaPlayerName).toBe(
                'Player Three'
            );
            expect(result.teamTwo.players[1].extraligaPlayerName).toBe(
                'Player Four'
            );

            expect(result.teamOne.players[0].heatOne).toEqual(playerHeat(3));
            expect(result.teamOne.players[0].comment).toBe('Solid ride');
            expect(result.teamTwo.players[0].heatTwo).toEqual(playerHeat(3));

            expect(
                (result.teamOne.players[0] as Record<string, unknown>).playerId
            ).toBeUndefined();
            expect(
                (result.teamOne as Record<string, unknown>).userId
            ).toBeUndefined();
            expect(
                (result.teamOne as Record<string, unknown>).startingLineupId
            ).toBeUndefined();
        });

        test('Should return roles without selected plays and empty summary data for a missing starting lineup', async () => {
            const userOne = await UserModel.create(createUserData(40));
            const userTwo = await UserModel.create(createUserData(41));
            const players = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' },
                { extraligaPlayerName: 'Player Two' },
                { extraligaPlayerName: 'Player Three' },
                { extraligaPlayerName: 'Player Four' },
                { extraligaPlayerName: 'Player Five' }
            ]);
            const playerIds = players.map(player => {
                return player._id.toString();
            });
            const startingLineup = await StartingLineupModel.create({
                userId: userTwo._id,
                roundNumber: 1,
                playerOne: playerIds[0],
                playerTwo: playerIds[1],
                playerThree: playerIds[2],
                playerFour: playerIds[3],
                playerFive: playerIds[4],
                roles: { pn: { playerId: playerIds[0], isDisabled: false }, kb: playerIds[1], p: playerIds[2] }
            });
            const schedule = await ScheduleModel.create({
                userOneId: userOne._id,
                userTwoId: userTwo._id,
                roundNumber: 1,
                ligueGroupsId: new mongoose.Types.ObjectId()
            });
            await ScoreDetailsModel.create({
                scheduleId: schedule._id,
                roundNumber: 1,
                teamOne: { userId: userOne._id },
                teamTwo: {
                    userId: userTwo._id,
                    startingLineupId: startingLineup._id
                }
            });

            const result =
                await ScoreDetailsModel.getScoreDetailsByScheduleAndRoundId(
                    schedule._id.toString(),
                    1
                );
            expect(result.teamOne.setPlays).toEqual([]);
            expect(result.teamTwo.setPlays).toEqual([]);
            expect(result.teamOne).toMatchObject({
                roles: null,
                setPlayPlayers: [],
                setPlayDescriptions: ''
            });
            expect(result.teamTwo).toMatchObject({
                roles: { pn: { playerId: playerIds[0], isDisabled: false }, kb: playerIds[1], p: playerIds[2] },
                setPlayPlayers: expect.arrayContaining([
                    {
                        playerId: playerIds[0],
                        extraligaPlayerName: 'Player One'
                    },
                    {
                        playerId: playerIds[1],
                        extraligaPlayerName: 'Player Two'
                    },
                    {
                        playerId: playerIds[2],
                        extraligaPlayerName: 'Player Three'
                    }
                ]),
                setPlayDescriptions: 'PN - Player One, KB - Player Two, P - Player Three'
            });
        });
    });

    describe('getScoreDetailsForHistory', () => {
        test('Should throw error when there is no score details data', async () => {
            await expect(
                ScoreDetailsModel.getScoreDetailsForHistory()
            ).rejects.toThrow('Score details not found');
        });

        test('Should return role and selected set play descriptions for both teams', async () => {
            const userOne = await new UserModel(createUserData(20)).save();
            const userTwo = await new UserModel(createUserData(21)).save();

            const players = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' },
                { extraligaPlayerName: 'Player Two' },
                { extraligaPlayerName: 'Player Three' },
                { extraligaPlayerName: 'Player Four' },
                { extraligaPlayerName: 'Player Five' },
                { extraligaPlayerName: 'Player Six' },
                { extraligaPlayerName: 'Player Seven' },
                { extraligaPlayerName: 'Player Eight' },
                { extraligaPlayerName: 'Player Nine' },
                { extraligaPlayerName: 'Player Ten' }
            ]);

            const startingLineupOne = await new StartingLineupModel({
                userId: userOne._id.toString(),
                roundNumber: 3,
                playerOne: players[0]._id.toString(),
                playerTwo: players[1]._id.toString(),
                playerThree: players[2]._id.toString(),
                playerFour: players[3]._id.toString(),
                playerFive: players[4]._id.toString(),
                roles: {
                    pn: { playerId: players[0]._id.toString(), isDisabled: false },
                    kb: players[1]._id.toString(),
                    p: players[2]._id.toString()
                }
            }).save();

            const startingLineupTwo = await new StartingLineupModel({
                userId: userTwo._id.toString(),
                roundNumber: 3,
                playerOne: players[5]._id.toString(),
                playerTwo: players[6]._id.toString(),
                playerThree: players[7]._id.toString(),
                playerFour: players[8]._id.toString(),
                playerFive: players[9]._id.toString(),
                roles: {
                    pn: { playerId: players[5]._id.toString(), isDisabled: false },
                    kb: players[6]._id.toString(),
                    p: players[7]._id.toString()
                }
            }).save();

            const [gwarancjaStartow, muchomor, mortalKombatCombo, ncd, ncd6] =
                await SetPlaysModel.create([
                    {
                        name: 'Gwarancja startów',
                        type: SetPlayEnumType.GwarancjaStartow
                    },
                    { name: 'Muchomor', type: SetPlayEnumType.Muchomor },
                    {
                        name: 'Mortal Kombat Combo',
                        type: SetPlayEnumType.MortalKombatCombo
                    },
                    { name: 'NCD', type: SetPlayEnumType.Ncd },
                    { name: 'NCD6', type: SetPlayEnumType.Ncd6 }
                ]);
            await SetPlaysDataModel.create([
                {
                    startingLineupId: startingLineupOne._id,
                    setPlayList: [
                        {
                            setPlayId: gwarancjaStartow._id,
                            userData: { playerId: players[0]._id.toString() }
                        },
                        { setPlayId: muchomor._id },
                        {
                            setPlayId: gwarancjaStartow._id,
                            userData: { playerId: players[4]._id.toString() }
                        }
                    ]
                },
                {
                    startingLineupId: startingLineupTwo._id,
                    setPlayList: [
                        { setPlayId: mortalKombatCombo._id },
                        {
                            setPlayId: ncd._id,
                            userData: { playerId: players[6]._id.toString() },
                            adminData: {
                                playerIdList: players.slice(0, 4).map(player => {
                                    return player._id.toString();
                                })
                            }
                        },
                        {
                            setPlayId: ncd6._id,
                            userData: { playerId: players[7]._id.toString() }
                        }
                    ]
                }
            ]);

            const schedule = await new ScheduleModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 3,
                ligueGroupsId: new mongoose.Types.ObjectId().toString(),
                userOneScore: 46,
                userTwoScore: 44
            }).save();

            const scoreDetailsToCreate: ScoreDetailsInputType = {
                scheduleId: schedule._id.toString(),
                roundNumber: 3,
                teamOne: {
                    userId: userOne._id.toString(),
                    players: [
                        {
                            playerId: players[0]._id.toString(),
                            heatOne: playerHeat(3),
                            setPlay: 1,
                            comment: 'Solid ride'
                        }
                    ],
                    trainer: {
                        heatOne: 1,
                        setPlay: 0,
                        comment: 'Trainer one'
                    },
                    startingLineupId: startingLineupOne._id.toString()
                },
                teamTwo: {
                    userId: userTwo._id.toString(),
                    players: [
                        {
                            playerId: players[1]._id.toString(),
                            heatOne: playerHeat(2),
                            setPlay: 0,
                            comment: 'Strong start'
                        }
                    ],
                    trainer: {
                        heatOne: 0,
                        setPlay: 1,
                        comment: 'Trainer two'
                    },
                    startingLineupId: startingLineupTwo._id.toString()
                }
            };

            await new ScoreDetailsModel(scoreDetailsToCreate).save();

            const result = await ScoreDetailsModel.getScoreDetailsForHistory();

            expect(result).toHaveLength(1);

            const [scoreDetails] = result;

            expect(scoreDetails.teamOne.setPlays).toBe(
                'PN - Player One, KB - Player Two, P - Player Three, GS: Player One, Muchomor:, GS: Player Five'
            );
            expect(scoreDetails.teamTwo.setPlays).toBe(
                'PN - Player Six, KB - Player Seven, P - Player Eight, MKC:, NCD: Player Seven, NCD6: Player Eight'
            );
            const liveScoreDetails =
                await ScoreDetailsModel.getScoreDetailsByScheduleAndRoundId(
                    schedule._id.toString(),
                    3
                );
            expect(liveScoreDetails.teamOne.setPlayDescriptions).toEqual(
                scoreDetails.teamOne.setPlays
            );
            expect(liveScoreDetails.teamTwo.setPlayDescriptions).toEqual(
                scoreDetails.teamTwo.setPlays
            );

            expect(scoreDetails.teamOne.trainer?.heatOne).toBe(1);
            expect(scoreDetails.teamOne.trainer?.setPlay).toBe(0);
            expect(scoreDetails.teamOne.trainer?.comment).toBe('Trainer one');

            expect(scoreDetails.teamTwo.trainer?.heatOne).toBe(0);
            expect(scoreDetails.teamTwo.trainer?.setPlay).toBe(1);
            expect(scoreDetails.teamTwo.trainer?.comment).toBe('Trainer two');

            expect(scoreDetails.teamOne.players).toHaveLength(1);
            expect(scoreDetails.teamOne.players[0].playerId?.toString()).toBe(
                players[0]._id.toString()
            );
            expect(scoreDetails.teamOne.players[0].heatOne).toBe(3);
            expect(scoreDetails.teamOne.players[0].heatTwo).toBeNull();
            expect(scoreDetails.teamOne.players[0].setPlay).toBe(1);
            expect(scoreDetails.teamOne.players[0].comment).toBe('Solid ride');

            expect(scoreDetails.teamTwo.players).toHaveLength(1);
            expect(scoreDetails.teamTwo.players[0].playerId?.toString()).toBe(
                players[1]._id.toString()
            );
            expect(scoreDetails.teamTwo.players[0].heatOne).toBe(2);
            expect(scoreDetails.teamTwo.players[0].setPlay).toBe(0);
            expect(scoreDetails.teamTwo.players[0].comment).toBe(
                'Strong start'
            );
        });

        test('Should export roles without selected plays and an empty comment for a missing starting lineup', async () => {
            const userOne = await UserModel.create(createUserData(40));
            const userTwo = await UserModel.create(createUserData(41));
            const players = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' },
                { extraligaPlayerName: 'Player Two' },
                { extraligaPlayerName: 'Player Three' },
                { extraligaPlayerName: 'Player Four' },
                { extraligaPlayerName: 'Player Five' }
            ]);
            const playerIds = players.map(player => {
                return player._id.toString();
            });
            const startingLineup = await StartingLineupModel.create({
                userId: userTwo._id,
                roundNumber: 1,
                playerOne: playerIds[0],
                playerTwo: playerIds[1],
                playerThree: playerIds[2],
                playerFour: playerIds[3],
                playerFive: playerIds[4],
                roles: { pn: { playerId: playerIds[0], isDisabled: false }, kb: playerIds[1], p: playerIds[2] }
            });
            const schedule = await ScheduleModel.create({
                userOneId: userOne._id,
                userTwoId: userTwo._id,
                roundNumber: 1,
                ligueGroupsId: new mongoose.Types.ObjectId()
            });
            await ScoreDetailsModel.create({
                scheduleId: schedule._id,
                roundNumber: 1,
                teamOne: { userId: userOne._id },
                teamTwo: {
                    userId: userTwo._id,
                    startingLineupId: startingLineup._id
                }
            });

            const [result] = await ScoreDetailsModel.getScoreDetailsForHistory();
            expect(result.teamOne.setPlays).toBe('');
            expect(result.teamTwo.setPlays).toBe(
                'PN - Player One, KB - Player Two, P - Player Three'
            );
        });
    });

    describe('deleteAll', () => {
        test('Should remove all documents from the collection', async () => {
            const userOne = await new UserModel(createUserData(30)).save();
            const userTwo = await new UserModel(createUserData(31)).save();

            await new ScoreDetailsModel({
                scheduleId: new mongoose.Types.ObjectId().toString(),
                roundNumber: 1,
                teamOne: { userId: userOne._id.toString() },
                teamTwo: { userId: userTwo._id.toString() }
            }).save();

            await ScoreDetailsModel.deleteAll();

            const remainingDocuments = await ScoreDetailsModel.find().exec();

            expect(remainingDocuments).toHaveLength(0);
        });
    });

    describe('getPlayerScoreDetailsByRoundAndUserId', () => {
        test('Should throw error if roundNumber not in range 1 - 14', async () => {
            const userOne = await new UserModel(createUserData(40)).save();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' }
            ]);

            await expect(
                ScoreDetailsModel.getPlayerScoreDetailsByRoundAndUserId(
                    15,
                    userOne._id.toString(),
                    player._id.toString()
                )
            ).rejects.toThrow(
                'Invalid roundNumber: 15. Must be between 1 and 14'
            );
        });

        test('Should throw error if userId does not exist in user collection', async () => {
            const invalidUserId = new mongoose.Types.ObjectId().toString();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' }
            ]);

            await expect(
                ScoreDetailsModel.getPlayerScoreDetailsByRoundAndUserId(
                    1,
                    invalidUserId,
                    player._id.toString()
                )
            ).rejects.toThrow(`Invalid userId: ${invalidUserId}`);
        });

        test('Should throw error if playerId does not exist in players collection', async () => {
            const userOne = await new UserModel(createUserData(41)).save();
            const invalidPlayerId = new mongoose.Types.ObjectId().toString();

            await expect(
                ScoreDetailsModel.getPlayerScoreDetailsByRoundAndUserId(
                    1,
                    userOne._id.toString(),
                    invalidPlayerId
                )
            ).rejects.toThrow(`Invalid playerId: ${invalidPlayerId}`);
        });

        test('Should return given playerId score details if all arguments provided successfully and score details already exists', async () => {
            const userOne = await new UserModel(createUserData(42)).save();
            const userTwo = await new UserModel(createUserData(43)).save();
            const [playerOne, playerTwo] = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' },
                { extraligaPlayerName: 'Player Two' }
            ]);

            const schedule = await new ScheduleModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 5,
                ligueGroupsId: new mongoose.Types.ObjectId().toString(),
                userOneScore: 46,
                userTwoScore: 44
            }).save();

            const scoreDetails = await new ScoreDetailsModel({
                scheduleId: schedule._id.toString(),
                roundNumber: 5,
                teamOne: {
                    userId: userOne._id.toString(),
                    players: [
                        {
                            playerId: playerOne._id.toString(),
                            heatOne: playerHeat(3, true, true),
                            heatTwo: playerHeat(0),
                            setPlay: 1,
                            comment: 'Solid ride'
                        }
                    ]
                },
                teamTwo: {
                    userId: userTwo._id.toString(),
                    players: [
                        {
                            playerId: playerTwo._id.toString(),
                            heatOne: playerHeat(1),
                            heatTwo: playerHeat(1),
                            setPlay: 0,
                            comment: 'Weak ride'
                        }
                    ]
                }
            }).save();

            const result =
                await ScoreDetailsModel.getPlayerScoreDetailsByRoundAndUserId(
                    5,
                    userOne._id.toString(),
                    playerOne._id.toString()
                );

            expect(result.scoreDetailsId).toBe(scoreDetails._id.toString());
            expect(result.teamType).toBe('teamOne');

            const playerScoreDetails: PlayerScoresType =
                result.playerScoreDetails;

            expect(playerScoreDetails.heatOne).toEqual(playerHeat(3, true, true));
            expect(playerScoreDetails.heatTwo).toEqual(playerHeat(0));
            expect(
                (playerScoreDetails as Record<string, unknown>).setPlay
            ).toBeUndefined();
            expect(
                (playerScoreDetails as Record<string, unknown>).comment
            ).toBeUndefined();
        });

        test('Should return object with default (null) values if for given playerId score details have not been saved yet', async () => {
            const userOne = await new UserModel(createUserData(44)).save();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' }
            ]);

            const result =
                await ScoreDetailsModel.getPlayerScoreDetailsByRoundAndUserId(
                    6,
                    userOne._id.toString(),
                    player._id.toString()
                );

            expect(result.scoreDetailsId).toBeNull();
            expect(result.teamType).toBeNull();

            const playerScoreDetails: PlayerScoresType =
                result.playerScoreDetails;

            expect(playerScoreDetails.heatOne).toEqual(playerHeat(null));
            expect(playerScoreDetails.heatTwo).toEqual(playerHeat(null));
            expect(playerScoreDetails.heatThree).toEqual(playerHeat(null));
            expect(playerScoreDetails.heatFour).toEqual(playerHeat(null));
            expect(playerScoreDetails.heatFive).toEqual(playerHeat(null));
            expect(playerScoreDetails.heatSix).toEqual(playerHeat(null));
            expect(playerScoreDetails.heatSeven).toEqual(playerHeat(null));
        });
    });

    describe('savePlayerScoreDetails', () => {
        test('Should throw error if schedule does not exist for given userId and roundNumber', async () => {
            const userOne = await new UserModel(createUserData(50)).save();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' }
            ]);

            const playerData = {
                userId: [userOne._id.toString()],
                startingLineupId: [new mongoose.Types.ObjectId().toString()],
                playerId: player!._id.toString(),
                playerName: player!.extraligaPlayerName
            };

            await expect(
                ScoreDetailsModel.savePlayerScoreDetails(playerData, 7, {
                    heatOne: playerHeat(3)
                })
            ).rejects.toThrow(
                `Schedule not found for userId: ${userOne._id.toString()} and roundNumber: 7`
            );
        });

        test('Should preserve both teams calculation details while saving player scores', async () => {
            const userOne = await UserModel.create(createUserData(71));
            const userTwo = await UserModel.create(createUserData(72));
            const player = await PlayersModel.create({
                extraligaPlayerName: 'Result rider'
            });
            const schedule = await ScheduleModel.create({
                userOneId: userOne._id,
                userTwoId: userTwo._id,
                roundNumber: 1,
                ligueGroupsId: new mongoose.Types.ObjectId()
            });
            const playerId = player._id.toString();
            const nominalPlayerId = new mongoose.Types.ObjectId().toString();
            const calculationDetails: TeamCalculationDetailsType = {
                players: [
                    playerId,
                    ...Array.from(
                        { length: STARTING_LINEUP_PLAYER_COUNT - 1 },
                        () => {
                            return new mongoose.Types.ObjectId().toString();
                        }
                    )
                ].map((id, index) => {
                    return {
                        playerId: id,
                        nominalPlayerId: index === 0 ? nominalPlayerId : id,
                        actualStartCount: index === 0 ? 7 : 0,
                        basePoints: index === 0 ? 18 : 0,
                        functionPoints: index === 0 ? 5 : 0,
                        rolePoints: 0,
                        setPlayPoints: index === 0 ? -2 : 0,
                        function: index === 0 ? 'Lider' : null,
                        role: index === 0 ? 'PN' : null
                    };
                }),
                trainer: { heatPoints: 9, setPlayPoints: 0 },
                setPlayResults: [
                    {
                        selectedSetPlayId:
                            new mongoose.Types.ObjectId().toString(),
                        setPlayId: new mongoose.Types.ObjectId().toString(),
                        name: 'Awatar',
                        type: SetPlayEnumType.Awatar,
                        recipients: [
                            {
                                recipientType: 'player',
                                playerId,
                                nominalPlayerId,
                                calculatedPoints: -2,
                                creditedPoints: -2,
                                setPlayContributionType: 'replacementDifference'
                            },
                            {
                                recipientType: 'trainer',
                                calculatedPoints: 0,
                                creditedPoints: 0,
                                setPlayContributionType: 'trainerHeatDifference'
                            }
                        ]
                    }
                ],
                floorAdjustment: 0
            };
            const team = { userId: userOne._id.toString(), calculationDetails };
            await ScoreDetailsModel.create(
                scoreDetailsZodSchema.parse({
                    scheduleId: schedule._id.toString(),
                    roundNumber: 1,
                    teamOne: team,
                    teamTwo: { ...team, userId: userTwo._id.toString() }
                })
            );

            await ScoreDetailsModel.savePlayerScoreDetails(
                {
                    userId: [userOne._id.toString()],
                    startingLineupId: [
                        new mongoose.Types.ObjectId().toString()
                    ],
                    playerId,
                    playerName: player.extraligaPlayerName
                },
                1,
                { heatOne: { value: 3 } }
            );

            const savedDocument = await ScoreDetailsModel.findOne({
                scheduleId: schedule._id
            }).exec();
            const savedTeams = savedDocument?.toJSON({
                flattenObjectIds: true
            });
            expect(savedTeams?.teamOne).toHaveProperty(
                'calculationDetails',
                calculationDetails
            );
            expect(savedTeams?.teamTwo).toHaveProperty(
                'calculationDetails',
                calculationDetails
            );
        });

        test('Should save heat values and flags with null defaults and no calculation details', async () => {
            const userOne = await new UserModel(createUserData(61)).save();
            const userTwo = await new UserModel(createUserData(62)).save();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' }
            ]);

            await new ScheduleModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 12,
                ligueGroupsId: new mongoose.Types.ObjectId().toString()
            }).save();

            const playerData = {
                userId: [userOne._id.toString()],
                startingLineupId: [new mongoose.Types.ObjectId().toString()],
                playerId: player!._id.toString(),
                playerName: player!.extraligaPlayerName
            };

            await ScoreDetailsModel.savePlayerScoreDetails(playerData, 12, {
                heatTwo: playerHeat(0),
                heatFour: playerHeat(2, true, true)
            });

            const savedDocument = await ScoreDetailsModel.findOne({
                roundNumber: 12
            }).exec();
            const savedPlayer = savedDocument?.teamOne.players?.[0];

            expect(savedDocument?.teamOne.calculationDetails).toBeUndefined();
            expect(savedDocument?.teamTwo.calculationDetails).toBeUndefined();

            expectPlayerHeat(savedPlayer?.heatOne, playerHeat(null));
            expectPlayerHeat(savedPlayer?.heatTwo, playerHeat(0));
            expectPlayerHeat(savedPlayer?.heatThree, playerHeat(null));
            expectPlayerHeat(savedPlayer?.heatFour, playerHeat(2, true, true));
            expectPlayerHeat(savedPlayer?.heatFive, playerHeat(null));
            expectPlayerHeat(savedPlayer?.heatSix, playerHeat(null));
            expectPlayerHeat(savedPlayer?.heatSeven, playerHeat(null));

            const result =
                await ScoreDetailsModel.getPlayerScoreDetailsByRoundAndUserId(
                    12,
                    userOne._id.toString(),
                    player!._id.toString()
                );

            expect(result.playerScoreDetails.heatTwo).toEqual(playerHeat(0));
            expect(result.playerScoreDetails.heatFour).toEqual(
                playerHeat(2, true, true)
            );
        });

        test('Should create score details document and save player under teamOne when userId matches schedule userOneId', async () => {
            const userOne = await new UserModel(createUserData(51)).save();
            const userTwo = await new UserModel(createUserData(52)).save();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' }
            ]);

            const schedule = await new ScheduleModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 8,
                ligueGroupsId: new mongoose.Types.ObjectId().toString()
            }).save();

            const startingLineupId = new mongoose.Types.ObjectId().toString();
            const playerData = {
                userId: [userOne._id.toString()],
                startingLineupId: [startingLineupId],
                playerId: player!._id.toString(),
                playerName: player!.extraligaPlayerName
            };

            const result = await ScoreDetailsModel.savePlayerScoreDetails(
                playerData,
                8,
                { heatOne: playerHeat(3), heatTwo: playerHeat(2) }
            );

            expect(result).toEqual({ success: true });

            const savedDocument = await ScoreDetailsModel.findOne({
                scheduleId: schedule._id.toString(),
                roundNumber: 8
            }).exec();

            expect(savedDocument?.teamOne.userId?.toString()).toBe(
                userOne._id.toString()
            );
            expect(savedDocument?.teamOne.startingLineupId?.toString()).toBe(
                startingLineupId
            );
            expect(savedDocument?.teamOne.players).toHaveLength(1);
            expect(
                savedDocument?.teamOne.players?.[0]?.playerId?.toString()
            ).toBe(player!._id.toString());
            const savedPlayer = savedDocument?.teamOne.players?.[0];
            expectPlayerHeat(savedPlayer?.heatOne, playerHeat(3));
            expectPlayerHeat(savedPlayer?.heatTwo, playerHeat(2));
            expectPlayerHeat(savedPlayer?.heatThree, playerHeat(null));
            expectPlayerHeat(savedPlayer?.heatSeven, playerHeat(null));
        });

        test('Should save player under teamTwo when userId matches schedule userTwoId', async () => {
            const userOne = await new UserModel(createUserData(53)).save();
            const userTwo = await new UserModel(createUserData(54)).save();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' }
            ]);

            await new ScheduleModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 9,
                ligueGroupsId: new mongoose.Types.ObjectId().toString()
            }).save();

            const startingLineupId = new mongoose.Types.ObjectId().toString();
            const playerData = {
                userId: [userTwo._id.toString()],
                startingLineupId: [startingLineupId],
                playerId: player!._id.toString(),
                playerName: player!.extraligaPlayerName
            };

            await ScoreDetailsModel.savePlayerScoreDetails(playerData, 9, {
                heatThree: playerHeat(1)
            });

            const savedDocument = await ScoreDetailsModel.findOne({
                roundNumber: 9
            }).exec();

            expect(savedDocument?.teamTwo.userId?.toString()).toBe(
                userTwo._id.toString()
            );
            const savedPlayer = savedDocument?.teamTwo.players?.[0];
            expectPlayerHeat(savedPlayer?.heatThree, playerHeat(1));
            expectPlayerHeat(savedPlayer?.heatOne, playerHeat(null));
            expectPlayerHeat(savedPlayer?.heatTwo, playerHeat(null));
        });

        test('Should update existing player entry instead of duplicating it', async () => {
            const userOne = await new UserModel(createUserData(55)).save();
            const userTwo = await new UserModel(createUserData(56)).save();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' }
            ]);

            await new ScheduleModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 10,
                ligueGroupsId: new mongoose.Types.ObjectId().toString()
            }).save();

            const playerData = {
                userId: [userOne._id.toString()],
                startingLineupId: [new mongoose.Types.ObjectId().toString()],
                playerId: player!._id.toString(),
                playerName: player!.extraligaPlayerName
            };

            await ScoreDetailsModel.savePlayerScoreDetails(playerData, 10, {
                heatOne: playerHeat(4, true, true),
                heatTwo: playerHeat(3)
            });
            await ScoreDetailsModel.savePlayerScoreDetails(playerData, 10, {
                heatOne: playerHeat(4),
                heatTwo: playerHeat(null)
            });

            const savedDocument = await ScoreDetailsModel.findOne({
                roundNumber: 10
            }).exec();

            expect(savedDocument?.teamOne.players).toHaveLength(1);
            const savedPlayer = savedDocument?.teamOne.players?.[0];
            expectPlayerHeat(savedPlayer?.heatOne, playerHeat(4));
            expectPlayerHeat(savedPlayer?.heatTwo, playerHeat(null));
            expectPlayerHeat(savedPlayer?.heatThree, playerHeat(null));
        });

        test('Should save score details for a player assigned to two different users across two schedules', async () => {
            const userOne = await new UserModel(createUserData(57)).save();
            const userTwo = await new UserModel(createUserData(58)).save();
            const userThree = await new UserModel(createUserData(59)).save();
            const userFour = await new UserModel(createUserData(60)).save();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Shared Player' }
            ]);

            await new ScheduleModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 11,
                ligueGroupsId: new mongoose.Types.ObjectId().toString()
            }).save();
            await new ScheduleModel({
                userOneId: userThree._id.toString(),
                userTwoId: userFour._id.toString(),
                roundNumber: 11,
                ligueGroupsId: new mongoose.Types.ObjectId().toString()
            }).save();

            const playerData = {
                userId: [userOne._id.toString(), userFour._id.toString()],
                startingLineupId: [
                    new mongoose.Types.ObjectId().toString(),
                    new mongoose.Types.ObjectId().toString()
                ],
                playerId: player!._id.toString(),
                playerName: player!.extraligaPlayerName
            };

            const result = await ScoreDetailsModel.savePlayerScoreDetails(
                playerData,
                11,
                { heatOne: playerHeat(5) }
            );

            expect(result).toEqual({ success: true });

            const savedDocuments = await ScoreDetailsModel.find({
                roundNumber: 11
            }).exec();

            expect(savedDocuments).toHaveLength(2);

            const documentForUserOne = savedDocuments.find(
                document =>
                    document.teamOne.userId?.toString() ===
                    userOne._id.toString()
            );
            const documentForUserFour = savedDocuments.find(
                document =>
                    document.teamTwo.userId?.toString() ===
                    userFour._id.toString()
            );

            const userOnePlayer = documentForUserOne?.teamOne.players?.[0];
            const userFourPlayer = documentForUserFour?.teamTwo.players?.[0];
            expectPlayerHeat(userOnePlayer?.heatOne, playerHeat(5));
            expectPlayerHeat(userFourPlayer?.heatOne, playerHeat(5));
            expectPlayerHeat(userOnePlayer?.heatTwo, playerHeat(null));
            expectPlayerHeat(userFourPlayer?.heatTwo, playerHeat(null));
        });
    });

    describe('calculateScoresByRound', () => {
        const createRound = async (roundNumber = 2) => {
            const users = await UserModel.insertMany(
                Array.from({ length: 12 }, (_, index) =>
                    createUserData(roundNumber * 12 + index)
                )
            );
            const players = await PlayersModel.create(
                Array.from({ length: 10 }, (_, index) => {
                    return {
                        extraligaPlayerName: `Round ${roundNumber} rider ${index}`,
                        isJunior: index % 5 === 4
                    };
                })
            );
            const lineups = await StartingLineupModel.create(
                users.map((user, index) => {
                    const ids = players
                        .slice((index % 2) * 5, (index % 2) * 5 + 5)
                        .map(player => player._id.toString());
                    return {
                        userId: user._id,
                        roundNumber,
                        playerOne: ids[0],
                        playerTwo: ids[1],
                        playerThree: ids[2],
                        playerFour: ids[3],
                        playerFive: ids[4],
                        roles: {
                            pn: { playerId: ids[0], isDisabled: false },
                            kb: ids[1],
                            p: ids[2]
                        }
                    };
                })
            );
            const schedules = await ScheduleModel.create(
                Array.from({ length: 6 }, (_, index) => {
                    return {
                        userOneId: users[index * 2]._id,
                        userTwoId: users[index * 2 + 1]._id,
                        roundNumber,
                        ligueGroupsId: new mongoose.Types.ObjectId(),
                        userOneScore: 99,
                        userTwoScore: 98
                    };
                })
            );
            const documents = await ScoreDetailsModel.create(
                schedules.map((schedule, index) => {
                    return {
                        scheduleId: schedule._id,
                        roundNumber,
                        teamOne: {
                            userId: users[index * 2]._id,
                            startingLineupId: lineups[index * 2]._id,
                            players: players.slice(0, 5).map(player => {
                                return {
                                    playerId: player._id,
                                    ...playerScoresZodSchema.parse({
                                        heatOne: playerHeat(0)
                                    })
                                };
                            })
                        },
                        teamTwo: {
                            userId: users[index * 2 + 1]._id,
                            startingLineupId: lineups[index * 2 + 1]._id,
                            players: players.slice(5).map(player => {
                                return {
                                    playerId: player._id,
                                    ...playerScoresZodSchema.parse({
                                        heatOne: playerHeat(0)
                                    })
                                };
                            })
                        }
                    };
                })
            );
            return { users, players, lineups, schedules, documents };
        };

        test('Should reject a round outside the regular season', async () => {
            await expect(
                ScoreDetailsModel.calculateScoresByRound(15)
            ).rejects.toThrow(
                'Invalid roundNumber: 15. Must be between 1 and 14'
            );
        });
        test('Should reject incomplete scores before updating any match', async () => {
            await expect(
                ScoreDetailsModel.calculateScoresByRound(2)
            ).rejects.toThrow('Score details are incomplete for round: 2');
        });

        test('Should reject calculation when the current season is missing', async () => {
            await createRound();
            await expect(
                ScoreDetailsModel.calculateScoresByRound(2)
            ).rejects.toThrow('Current season not found');
        });

        test.each([
            'schedule',
            'lineup',
            'players',
            'metadata',
            'coverage',
            'user'
        ])(
            'Should reject invalid %s references before updating any match',
            async kind => {
                const fixture = await createRound();
                await SeasonOpsModel.create({
                    name: '2026',
                    isCurrentSeason: true,
                    numberOfGroups: 1
                });
                const document = fixture.documents[5];
                let expected: string;
                if (kind === 'schedule') {
                    await ScheduleModel.updateOne(
                        { _id: fixture.schedules[5]._id },
                        { userOneId: new mongoose.Types.ObjectId() }
                    );
                    expected = `Invalid schedule for score details: ${document._id}`;
                } else if (kind === 'lineup') {
                    await StartingLineupModel.deleteOne({
                        _id: fixture.lineups[10]._id
                    });
                    expected = `Invalid starting lineup for user: ${fixture.users[10]._id}`;
                } else if (kind === 'players') {
                    await StartingLineupModel.updateOne(
                        { _id: fixture.lineups[10]._id },
                        { playerFive: fixture.players[5]._id }
                    );
                    expected = `Starting lineup players do not match score details for user: ${fixture.users[10]._id}`;
                } else if (kind === 'metadata') {
                    await PlayersModel.deleteOne({
                        _id: fixture.players[0]._id
                    });
                    expected = `Missing player: ${fixture.players[0]._id}`;
                } else if (kind === 'coverage') {
                    await ScheduleModel.create({
                        roundNumber: 2,
                        userOneId: fixture.users[0]._id,
                        userTwoId: fixture.users[1]._id
                    });
                    expected = 'Schedule coverage is incomplete for round: 2';
                } else {
                    await UserModel.deleteOne({ _id: fixture.users[11]._id });
                    expected = 'Missing team user for round: 2';
                }
                await expect(
                    ScoreDetailsModel.calculateScoresByRound(2)
                ).rejects.toThrow(expected);
                expect(
                    (await ScheduleModel.findById(fixture.schedules[0]._id))
                        ?.userOneScore
                ).toBe(99);
                expect(
                    (await ScoreDetailsModel.findById(fixture.documents[0]._id))
                        ?.teamOne.trainer?.comment
                ).toBeUndefined();
                expect(
                    (
                        await SeasonOpsModel.findOne({
                            isCurrentSeason: true
                        }).exec()
                    )?.isScoreCalculatded[2]
                ).toBe(false);
            }
        );

        test('Should reject an invalid KFN interval in the last match before saving any result', async () => {
            const fixture = await createRound();
            await SeasonOpsModel.create({
                name: '2026',
                isCurrentSeason: true,
                numberOfGroups: 1
            });
            const kfn = await SetPlaysModel.create({
                name: 'KFN',
                type: SetPlayEnumType.KoloFortunyNorbiego
            });
            await SetPlaysDataModel.collection.insertOne({
                startingLineupId: fixture.lineups[10]._id,
                setPlayList: [
                    {
                        _id: new mongoose.Types.ObjectId(),
                        setPlayId: kfn._id,
                        userData: { minimum: 0, maximum: 22 }
                    }
                ]
            });
            await expect(
                ScoreDetailsModel.calculateScoresByRound(2)
            ).rejects.toThrow('Invalid KFN interval: 0-22');
            expect(
                (await ScheduleModel.findById(fixture.schedules[0]._id))
                    ?.userOneScore
            ).toBe(99);
            expect(
                (await ScoreDetailsModel.findById(fixture.documents[0]._id))
                    ?.teamOne.trainer?.comment
            ).toBeUndefined();
        });

        test('Should reject missing NCD admin data before updating any match', async () => {
            const fixture = await createRound();
            await SeasonOpsModel.create({
                name: '2026',
                isCurrentSeason: true,
                numberOfGroups: 1
            });
            const ncd = await SetPlaysModel.create({
                name: 'NCD',
                type: SetPlayEnumType.Ncd
            });
            await SetPlaysDataModel.collection.insertOne({
                startingLineupId: fixture.lineups[10]._id,
                setPlayList: [
                    {
                        _id: new mongoose.Types.ObjectId(),
                        setPlayId: ncd._id,
                        userData: {
                            playerId: fixture.players[0]._id.toString()
                        }
                    }
                ]
            });
            await expect(
                ScoreDetailsModel.calculateScoresByRound(2)
            ).rejects.toThrow(
                'NCD admin data is required for score calculation'
            );
            expect(
                (await ScheduleModel.findById(fixture.schedules[0]._id))
                    ?.userOneScore
            ).toBe(99);
        });

        test('Should keep the round uncalculated when saving a match fails', async () => {
            await createRound();
            const season = await SeasonOpsModel.create({
                name: '2026',
                isCurrentSeason: true,
                numberOfGroups: 1
            });
            const update = jest
                .spyOn(ScheduleModel, 'updateOne')
                .mockImplementationOnce(() => {
                    throw new Error('Schedule write failed');
                });
            try {
                await expect(
                    ScoreDetailsModel.calculateScoresByRound(2)
                ).rejects.toThrow('Schedule write failed');
                expect(
                    (await SeasonOpsModel.findById(season._id).exec())
                        ?.isScoreCalculatded[2]
                ).toBe(false);
            } finally {
                update.mockRestore();
            }
        });

        test('Should load replacement junior status and retain unused reserve comments', async () => {
            const fixture = await createRound();
            await SeasonOpsModel.create({
                name: '2026',
                isCurrentSeason: true,
                numberOfGroups: 1
            });
            const replacements = await PlayersModel.create([
                { extraligaPlayerName: 'Awatar junior', isJunior: true },
                { extraligaPlayerName: 'Unused reserve', isJunior: false }
            ]);
            const awatar = await SetPlaysModel.create({
                name: 'Awatar',
                type: SetPlayEnumType.Awatar
            });
            const reserve = await SetPlaysModel.create({
                name: 'Rezerwa',
                type: SetPlayEnumType.Rezerwa
            });
            await StartingLineupModel.updateOne(
                { _id: fixture.lineups[0]._id },
                { 'roles.p': fixture.players[4]._id }
            );
            await SetPlaysDataModel.collection.insertOne({
                startingLineupId: fixture.lineups[0]._id,
                setPlayList: [
                    {
                        _id: new mongoose.Types.ObjectId(),
                        setPlayId: awatar._id,
                        userData: {
                            playerId: replacements[0]._id.toString(),
                            replacedPlayerId: fixture.players[4]._id.toString()
                        },
                        adminData: {
                            ...playerScoresZodSchema.parse({
                                heatOne: playerHeat(2, true)
                            }),
                            isDisabled: false,
                            isMatchDraw: false
                        }
                    },
                    {
                        _id: new mongoose.Types.ObjectId(),
                        setPlayId: reserve._id,
                        userData: { playerId: replacements[1]._id.toString() },
                        adminData: playerScoresZodSchema.parse({
                            heatOne: playerHeat(0)
                        })
                    }
                ]
            });
            await ScoreDetailsModel.calculateScoresByRound(2);
            const saved = await ScoreDetailsModel.findById(
                fixture.documents[0]._id
            );
            expect(saved?.teamOne.players?.[4].comment).toBe('P 2, Awatar +2');
            expectPlayerHeat(
                saved?.teamOne.players?.[4].heatOne,
                playerHeat(0)
            );
            expect(saved?.teamOne.trainer?.comment).toBe('Rezerwa 0');
            expect(
                (await ScheduleModel.findById(fixture.schedules[0]._id))
                    ?.userOneScore
            ).toBe(4);
        });

        test('Should recalculate scores after a heat correction without changing other rounds', async () => {
            const fixture = await createRound();
            await ScoreDetailsModel.updateOne(
                { _id: fixture.documents[5]._id },
                {
                    'teamTwo.players.4': {
                        playerId: fixture.players[9]._id,
                        ...playerScoresZodSchema.parse({})
                    }
                }
            );
            expect(await ScoreDetailsModel.isScoreCalculationsEnabled(2)).toBe(true);
            const otherRound = await createRound(3);
            const season = await SeasonOpsModel.create({
                name: '2026',
                isCurrentSeason: true,
                numberOfGroups: 1
            });
            const ncd = await SetPlaysModel.create({
                name: 'NCD6',
                type: SetPlayEnumType.Ncd6
            });
            await SetPlaysDataModel.collection.insertOne({
                startingLineupId: fixture.lineups[0]._id,
                setPlayList: [
                    {
                        _id: new mongoose.Types.ObjectId(),
                        setPlayId: ncd._id,
                        userData: {
                            playerId: fixture.players[0]._id.toString()
                        },
                        adminData: {
                            playerIdList: fixture.players
                                .slice(1, 5)
                                .map(player => player._id.toString())
                        }
                    }
                ]
            });
            await expect(
                ScoreDetailsModel.calculateScoresByRound(2)
            ).resolves.toBeUndefined();
            let saved = await ScoreDetailsModel.findById(
                fixture.documents[0]._id
            );
            expect(saved?.teamOne.players?.[0].setPlay).toBe(-2);
            expect(saved?.teamOne.players?.[0].comment).toBe(
                'Lider 0, PN 0, NCD6 -2'
            );
            expect(saved?.teamOne.trainer?.comment).toBe('');
            expect(
                (await ScheduleModel.findById(fixture.schedules[0]._id))
                    ?.userOneScore
            ).toBe(0);
            expect(
                (await SeasonOpsModel.findById(season._id).exec())
                    ?.isScoreCalculatded[2]
            ).toBe(true);
            const before =
                await ScoreDetailsModel.getScoreDetailsByScheduleAndRoundId(
                    fixture.schedules[0]._id.toString(),
                    2
                );
            await ScoreDetailsModel.calculateScoresByRound(2);
            expect(
                await ScoreDetailsModel.getScoreDetailsByScheduleAndRoundId(
                    fixture.schedules[0]._id.toString(),
                    2
                )
            ).toEqual(before);
            await ScoreDetailsModel.updateOne(
                { _id: fixture.documents[0]._id },
                { 'teamOne.players.0.heatOne': playerHeat(3, true, true) }
            );
            await ScoreDetailsModel.calculateScoresByRound(2);
            saved = await ScoreDetailsModel.findById(fixture.documents[0]._id);
            expect(saved?.teamOne.players?.[0].setPlay).toBe(1);
            expect(saved?.teamOne.players?.[0].comment).toBe(
                'Lider 0, PN 3, NCD6 -2'
            );
            expectPlayerHeat(
                saved?.teamOne.players?.[0].heatOne,
                playerHeat(3, true, true)
            );
            expect(saved?.teamOne.players?.[0].heatSeven.value).toBeNull();
            expect(
                (await ScheduleModel.findById(fixture.schedules[0]._id))
                    ?.userOneScore
            ).toBe(7);
            expect(
                (await ScheduleModel.findById(otherRound.schedules[0]._id))
                    ?.userOneScore
            ).toBe(99);
            expect(
                (await ScoreDetailsModel.findById(otherRound.documents[0]._id))
                    ?.teamOne.trainer?.comment
            ).toBeUndefined();
            expect(
                (await SeasonOpsModel.findById(season._id).exec())
                    ?.isScoreCalculatded[3]
            ).toBe(false);
        });
    });

    describe('isScoreCalculationsEnabled', () => {
        const createCompletePlayer = () => ({
            playerId: new mongoose.Types.ObjectId().toString(),
            heatOne: playerHeat(1),
            heatTwo: playerHeat(1),
            heatThree: playerHeat(1),
            heatFour: playerHeat(1),
            heatFive: playerHeat(1),
            heatSix: playerHeat(1),
            heatSeven: playerHeat(1)
        });

        const createCompletePlayers = () =>
            Array.from({ length: 5 }, () => createCompletePlayer());

        const createCompleteScoreDetails = (roundNumber: number) => ({
            scheduleId: new mongoose.Types.ObjectId().toString(),
            roundNumber,
            teamOne: {
                userId: new mongoose.Types.ObjectId().toString(),
                players: createCompletePlayers()
            },
            teamTwo: {
                userId: new mongoose.Types.ObjectId().toString(),
                players: createCompletePlayers()
            }
        });

        test('Should throw error if roundNumber not in range 1 - 14', async () => {
            await expect(
                ScoreDetailsModel.isScoreCalculationsEnabled(15)
            ).rejects.toThrow(
                'Invalid roundNumber: 15. Must be between 1 and 14'
            );
        });

        test('Should return false if fewer than 6 score details documents exist for given roundNumber', async () => {
            await ScoreDetailsModel.create([
                createCompleteScoreDetails(1),
                createCompleteScoreDetails(1)
            ]);

            const result =
                await ScoreDetailsModel.isScoreCalculationsEnabled(1);

            expect(result).toBe(false);
        });

        test('Should return false if 6 documents exist but not all players have heats filled in', async () => {
            const scoreDetailsData = [
                createCompleteScoreDetails(2),
                createCompleteScoreDetails(2),
                createCompleteScoreDetails(2),
                createCompleteScoreDetails(2),
                createCompleteScoreDetails(2),
                createCompleteScoreDetails(2)
            ];
            const incompletePlayer = createCompletePlayer();
            delete (incompletePlayer.heatSeven as Record<string, unknown>).value;
            scoreDetailsData[5]!.teamTwo.players = [
                incompletePlayer,
                ...createCompletePlayers().slice(1)
            ];

            await ScoreDetailsModel.create(scoreDetailsData);

            const result =
                await ScoreDetailsModel.isScoreCalculationsEnabled(2);

            expect(result).toBe(false);
        });

        test('Should return false if a team has a players array with length other than 5', async () => {
            const scoreDetailsData = [
                createCompleteScoreDetails(4),
                createCompleteScoreDetails(4),
                createCompleteScoreDetails(4),
                createCompleteScoreDetails(4),
                createCompleteScoreDetails(4),
                createCompleteScoreDetails(4)
            ];
            scoreDetailsData[5]!.teamOne.players =
                createCompletePlayers().slice(0, 4);

            await ScoreDetailsModel.create(scoreDetailsData);

            const result =
                await ScoreDetailsModel.isScoreCalculationsEnabled(4);

            expect(result).toBe(false);
        });

        test('Should return true if 6 documents exist and all players have heats filled in', async () => {
            const scoreDetailsData = [
                createCompleteScoreDetails(3),
                createCompleteScoreDetails(3),
                createCompleteScoreDetails(3),
                createCompleteScoreDetails(3),
                createCompleteScoreDetails(3),
                createCompleteScoreDetails(3)
            ];
            scoreDetailsData[0]!.teamOne.players[0] = {
                playerId: scoreDetailsData[0]!.teamOne.players[0].playerId,
                ...playerScoresZodSchema.parse({})
            };
            scoreDetailsData[5]!.teamTwo.players[0]!.heatSix = playerHeat(0);
            scoreDetailsData[5]!.teamTwo.players[0]!.heatSeven = playerHeat(null);

            await ScoreDetailsModel.create(scoreDetailsData);

            const result =
                await ScoreDetailsModel.isScoreCalculationsEnabled(3);

            expect(result).toBe(true);
        });
    });
});
