import type { TeamCalculationDetailsType } from '@/db/models/schema.types';

import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import { STARTING_LINEUP_PLAYER_COUNT } from '@/db/db.constants';
import ScheduleModel from '@/db/models/games/schedule';
import SchedulePlayoffModel from '@/db/models/games/schedule-playoff';
import ScoreDetailsModel from '@/db/models/games/score-details';
import ScoreDetailsPlayoffModel, {
    scoreDetailsPlayoffZodSchema,
    ScoreDetailsPlayoffReturnType,
    ScoreDetailsPlayoffInputType
} from '@/db/models/games/score-details-playoff';
import SetPlayPlayoffDataModel from '@/db/models/games/set-play-playoff-data';
import SetPlaysDataModel from '@/db/models/games/set-plays-data';
import StartingLineupModel from '@/db/models/games/starting-lineup';
import StartingLineupPlayoffModel from '@/db/models/games/starting-lineup-playoff';
import PlayersModel from '@/db/models/players';
import {
    SetPlayEnumType,
    playerScoresZodSchema
} from '@/db/models/schema.types';
import SeasonOpsModel from '@/db/models/season-ops';
import SetPlaysModel from '@/db/models/set-plays';
import UserModel, { UserType } from '@/db/models/user';

const createUserData = (index: number): UserType => ({
    username: `playoff-user-${index + 1}`,
    coachName: `Coach ${index + 1}`,
    email: `playoff-user-${index + 1}@example.com`,
    password: 'Password1!',
    teamName: `Playoff Team ${index + 1}`,
    logoUrl: `https://example.com/playoff-team-${index + 1}.png`,
    reachedPlayoff: true,
    isFirstRoundDraftOrderDraw: false,
    groupName: new mongoose.Types.ObjectId().toString(),
    bio: `Playoff user ${index + 1} bio`,
    cabinetTrophy: [],
    isAdmin: false
});

async function createPlayoffRound(roundNumber = 1) {
    const users = await UserModel.insertMany(
        Array.from({ length: 4 }, (_, index) => {
            return createUserData(roundNumber * 10 + index);
        })
    );
    const players = await PlayersModel.create(
        Array.from({ length: 10 }, (_, index) => {
            return {
                extraligaPlayerName: `Playoff round ${roundNumber} rider ${index}`,
                isJunior: index % 5 === 4
            };
        })
    );
    const startingLineups = await StartingLineupPlayoffModel.create(
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
    const schedules = await SchedulePlayoffModel.create(
        [0, 1].map(index => {
            return {
                userOneId: users[index * 2]._id,
                userTwoId: users[index * 2 + 1]._id,
                roundNumber,
                stage:
                    roundNumber < 3
                        ? 'semifinal'
                        : index === 0
                          ? 'final'
                          : '3rdplace',
                userOneSeed: index * 2 + 1,
                userTwoSeed: index * 2 + 2,
                userOneScore: 99,
                userTwoScore: 98
            };
        })
    );
    const documents = await ScoreDetailsPlayoffModel.create(
        schedules.map((schedule, index) => {
            const teams = [0, 1].map(teamIndex => {
                return {
                    userId: users[index * 2 + teamIndex]._id,
                    startingLineupId:
                        startingLineups[index * 2 + teamIndex]._id,
                    players: players
                        .slice(teamIndex * 5, teamIndex * 5 + 5)
                        .map(player => {
                            return {
                                playerId: player._id,
                                ...playerScoresZodSchema.parse({
                                    heatOne: { value: 0 }
                                })
                            };
                        })
                };
            });
            return {
                scheduleId: schedule._id,
                roundNumber,
                teamOne: teams[0],
                teamTwo: teams[1]
            };
        }),
        { ordered: true }
    );
    return { users, players, startingLineups, schedules, documents };
}

type PlayoffCalculationErrorCaseType = {
    scenario: string;
    invalidate: (
        fixture: Awaited<ReturnType<typeof createPlayoffRound>>,
        document: Awaited<ReturnType<typeof createPlayoffRound>>['documents'][number]
    ) => Promise<string>;
};

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

beforeEach(async () => {
    await SeasonOpsModel.deleteMany();
    await ScoreDetailsModel.deleteMany();
    await ScheduleModel.deleteMany();
    await SetPlayPlayoffDataModel.deleteMany();
    await SetPlaysDataModel.deleteMany();
    await SetPlaysModel.deleteMany();
    await StartingLineupModel.deleteMany();
    await ScoreDetailsPlayoffModel.deleteMany();
    await SchedulePlayoffModel.deleteMany();
    await StartingLineupPlayoffModel.deleteMany();
    await PlayersModel.deleteMany();
    await UserModel.deleteMany();
});

afterAll(async () => {
    await SeasonOpsModel.deleteMany();
    await ScoreDetailsModel.deleteMany();
    await ScheduleModel.deleteMany();
    await SetPlayPlayoffDataModel.deleteMany();
    await SetPlaysDataModel.deleteMany();
    await SetPlaysModel.deleteMany();
    await StartingLineupModel.deleteMany();
    await ScoreDetailsPlayoffModel.deleteMany();
    await SchedulePlayoffModel.deleteMany();
    await StartingLineupPlayoffModel.deleteMany();
    await PlayersModel.deleteMany();
    await UserModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test ScoreDetailsPlayoffModel methods and static functions', () => {
    describe('getScoreDetailsByScheduleAndRoundId', () => {
        test('Should throw error if invalid scheduleId is provided', async () => {
            const invalidScheduleId = new mongoose.Types.ObjectId().toString();

            await expect(
                ScoreDetailsPlayoffModel.getScoreDetailsByScheduleAndRoundId(
                    invalidScheduleId,
                    1
                )
            ).rejects.toThrow(`Invalid scheduleId: ${invalidScheduleId}`);
        });

        test('Should throw error if playoff score details document not found', async () => {
            const userOne = await new UserModel(createUserData(10)).save();
            const userTwo = await new UserModel(createUserData(11)).save();

            const schedule = await new SchedulePlayoffModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 2,
                userOneScore: 55,
                userTwoScore: 35,
                userOneSeed: 1,
                userTwoSeed: 4,
                stage: 'final'
            }).save();

            const missingRoundNumber = 99;

            await expect(
                ScoreDetailsPlayoffModel.getScoreDetailsByScheduleAndRoundId(
                    schedule._id.toString(),
                    missingRoundNumber
                )
            ).rejects.toThrow(
                `Score details for scheduleId: ${schedule._id.toString()} and roundNumber: ${missingRoundNumber} not found`
            );
        });

        test('Should return playoff score details with all referenced data populated correctly', async () => {
            const userOne = await new UserModel(createUserData(0)).save();
            const userTwo = await new UserModel(createUserData(1)).save();

            const players = await PlayersModel.create([
                { extraligaPlayerName: 'Playoff Player One' },
                { extraligaPlayerName: 'Playoff Player Two' },
                { extraligaPlayerName: 'Playoff Player Three' },
                { extraligaPlayerName: 'Playoff Player Four' },
                { extraligaPlayerName: 'Playoff Player Five' },
                { extraligaPlayerName: 'Playoff Player Six' },
                { extraligaPlayerName: 'Playoff Player Seven' },
                { extraligaPlayerName: 'Playoff Player Eight' },
                { extraligaPlayerName: 'Playoff Player Nine' },
                { extraligaPlayerName: 'Playoff Player Ten' }
            ]);

            const startingLineupOne = await new StartingLineupPlayoffModel({
                userId: userOne._id.toString(),
                roundNumber: 1,
                playerOne: players[0]._id.toString(),
                playerTwo: players[1]._id.toString(),
                playerThree: players[2]._id.toString(),
                playerFour: players[3]._id.toString(),
                playerFive: players[4]._id.toString(),
                roles: {
                    pn: { playerId: players[0]._id, isDisabled: false },
                    kb: players[1]._id,
                    p: players[2]._id
                }
            }).save();

            const startingLineupTwo = await new StartingLineupPlayoffModel({
                userId: userTwo._id.toString(),
                roundNumber: 1,
                playerOne: players[5]._id.toString(),
                playerTwo: players[6]._id.toString(),
                playerThree: players[7]._id.toString(),
                playerFour: players[8]._id.toString(),
                playerFive: players[9]._id.toString(),
                roles: {
                    pn: { playerId: players[5]._id, isDisabled: false },
                    kb: players[6]._id,
                    p: players[7]._id
                }
            }).save();

            const schedule = await new SchedulePlayoffModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 1,
                userOneScore: 50,
                userTwoScore: 40,
                userOneSeed: 1,
                userTwoSeed: 4,
                stage: 'semifinal'
            }).save();

            const scoreDetailsToCreate: ScoreDetailsPlayoffInputType = {
                scheduleId: schedule._id.toString(),
                roundNumber: 1,
                teamOne: {
                    userId: userOne._id.toString(),
                    players: [
                        {
                            playerId: players[0]._id.toString(),
                            heatOne: {
                                value: 3,
                                bonus: true,
                                isNominated: true
                            },
                            heatTwo: {
                                value: 2,
                                bonus: false,
                                isNominated: false
                            },
                            setPlay: 1,
                            comment: 'Playoff solid ride'
                        },
                        {
                            playerId: players[1]._id.toString(),
                            heatOne: {
                                value: 1,
                                bonus: false,
                                isNominated: false
                            },
                            heatTwo: {
                                value: 3,
                                bonus: false,
                                isNominated: false
                            },
                            setPlay: 0,
                            comment: 'Playoff good finish'
                        }
                    ],
                    trainer: {
                        heatOne: 1,
                        setPlay: 0,
                        comment: 'Playoff trainer one'
                    },
                    startingLineupId: startingLineupOne._id.toString()
                },
                teamTwo: {
                    userId: userTwo._id.toString(),
                    players: [
                        {
                            playerId: players[2]._id.toString(),
                            heatOne: {
                                value: 2,
                                bonus: false,
                                isNominated: false
                            },
                            heatTwo: {
                                value: 3,
                                bonus: false,
                                isNominated: false
                            },
                            setPlay: 1,
                            comment: 'Playoff strong start'
                        },
                        {
                            playerId: players[3]._id.toString(),
                            heatOne: {
                                value: 0,
                                bonus: false,
                                isNominated: false
                            },
                            heatTwo: {
                                value: 1,
                                bonus: false,
                                isNominated: false
                            },
                            setPlay: 0,
                            comment: 'Playoff needs improvement'
                        }
                    ],
                    trainer: {
                        heatOne: 0,
                        setPlay: 1,
                        comment: 'Playoff trainer two'
                    },
                    startingLineupId: startingLineupTwo._id.toString()
                }
            };

            await new ScoreDetailsPlayoffModel(scoreDetailsToCreate).save();

            const result: ScoreDetailsPlayoffReturnType =
                await ScoreDetailsPlayoffModel.getScoreDetailsByScheduleAndRoundId(
                    schedule._id.toString(),
                    1
                );

            expect(result.roundNumber).toBe(1);
            expect(result.userOneScore).toBe(50);
            expect(result.userTwoScore).toBe(40);

            expect(result.teamOne.teamName).toBe(userOne.teamName);
            expect(result.teamTwo.teamName).toBe(userTwo.teamName);

            expect(result.teamOne.setPlays).toEqual([]);
            expect(result.teamTwo.setPlays).toEqual([]);
            expect(result.teamOne).toHaveProperty(
                'setPlayDescriptions',
                'PN - Playoff Player One, KB - Playoff Player Two, P - Playoff Player Three'
            );

            expect(result.teamOne.players).toHaveLength(2);
            expect(result.teamTwo.players).toHaveLength(2);

            expect(result.teamOne.players[0].extraligaPlayerName).toBe(
                'Playoff Player One'
            );
            expect(result.teamOne.players[1].extraligaPlayerName).toBe(
                'Playoff Player Two'
            );
            expect(result.teamTwo.players[0].extraligaPlayerName).toBe(
                'Playoff Player Three'
            );
            expect(result.teamTwo.players[1].extraligaPlayerName).toBe(
                'Playoff Player Four'
            );

            expect(result.teamOne.players[0].heatOne).toEqual({
                value: 3,
                bonus: true,
                isNominated: true
            });
            expect(result.teamOne.players[0].comment).toBe(
                'Playoff solid ride'
            );
            expect(result.teamTwo.players[0].heatTwo).toEqual({
                value: 3,
                bonus: false,
                isNominated: false
            });

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
        test('Should return playoff roles and selected set plays with rider names while excluding admin data and regular-season set plays', async () => {
            const [userOne, userTwo] = await UserModel.create([
                createUserData(70),
                createUserData(71)
            ]);
            const players = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' },
                { extraligaPlayerName: 'Player Two' },
                { extraligaPlayerName: 'Player Three' },
                { extraligaPlayerName: 'Player Four' },
                { extraligaPlayerName: 'Player Five' },
                { extraligaPlayerName: 'Reserve Rider' },
                { extraligaPlayerName: 'Opponent Rider' }
            ]);
            const lineupData = {
                userId: userOne._id.toString(),
                roundNumber: 1,
                playerOne: players[0]._id.toString(),
                playerTwo: players[1]._id.toString(),
                playerThree: players[2]._id.toString(),
                playerFour: players[3]._id.toString(),
                playerFive: players[4]._id.toString(),
                roles: {
                    pn: {
                        playerId: players[0]._id.toString(),
                        isDisabled: true
                    },
                    kb: players[1]._id.toString(),
                    p: players[2]._id.toString()
                }
            };
            const regularLineup = await StartingLineupModel.create(lineupData);
            const playoffLineup =
                await StartingLineupPlayoffModel.create(lineupData);
            const [ncd, reserve, spartacus, ncd6] = await SetPlaysModel.create([
                { name: 'NCD', type: SetPlayEnumType.Ncd },
                { name: 'Rezerwa Giełda', type: SetPlayEnumType.RezerwaGielda },
                { name: 'Spartacus', type: SetPlayEnumType.Spartacus },
                { name: 'NCD6', type: SetPlayEnumType.Ncd6 }
            ]);
            await SetPlaysDataModel.saveSetPlay(
                regularLineup._id.toString(),
                {
                    setPlayId: ncd6._id.toString(),
                    userData: { playerId: players[1]._id.toString() }
                },
                SetPlayEnumType.Ncd6
            );
            await SetPlayPlayoffDataModel.saveSetPlay(
                playoffLineup._id.toString(),
                {
                    setPlayId: ncd._id.toString(),
                    userData: { playerId: players[0]._id.toString() }
                },
                SetPlayEnumType.Ncd
            );
            await SetPlayPlayoffDataModel.saveSetPlay(
                playoffLineup._id.toString(),
                {
                    setPlayId: reserve._id.toString(),
                    userData: { playerId: players[5]._id.toString() }
                },
                SetPlayEnumType.RezerwaGielda
            );
            const selected = await SetPlayPlayoffDataModel.saveSetPlay(
                playoffLineup._id.toString(),
                {
                    setPlayId: spartacus._id.toString(),
                    userData: {
                        ownPlayerId: players[0]._id.toString(),
                        opponentPlayerId: players[6]._id.toString()
                    }
                },
                SetPlayEnumType.Spartacus
            );
            await SetPlayPlayoffDataModel.saveAdminSetPlay(
                '1',
                userOne._id.toString(),
                [
                    {
                        ...selected[0],
                        adminData: {
                            playerIdList: players
                                .slice(0, 4)
                                .map(player => player._id.toString())
                        }
                    },
                    {
                        ...selected[2],
                        adminData: { ownAverage: 1, opponentAverage: 2 }
                    }
                ]
            );
            const schedule = await SchedulePlayoffModel.create({
                userOneId: userOne._id,
                userTwoId: userTwo._id,
                roundNumber: 1,
                userOneSeed: 1,
                userTwoSeed: 4,
                stage: 'semifinal'
            });
            await ScoreDetailsPlayoffModel.create({
                scheduleId: schedule._id,
                roundNumber: 1,
                teamOne: {
                    userId: userOne._id,
                    startingLineupId: playoffLineup._id,
                    players: [{ playerId: players[0]._id }]
                },
                teamTwo: { userId: userTwo._id }
            });

            const result =
                await ScoreDetailsPlayoffModel.getScoreDetailsByScheduleAndRoundId(
                    schedule._id.toString(),
                    1
                );
            expect(result.teamOne.roles).toEqual(lineupData.roles);
            expect(result.teamOne.setPlays).toEqual([
                {
                    name: 'NCD',
                    type: SetPlayEnumType.Ncd,
                    userData: { playerId: players[0]._id.toString() }
                },
                {
                    name: 'Rezerwa Giełda',
                    type: SetPlayEnumType.RezerwaGielda,
                    userData: { playerId: players[5]._id.toString() }
                },
                {
                    name: 'Spartacus',
                    type: SetPlayEnumType.Spartacus,
                    userData: {
                        ownPlayerId: players[0]._id.toString(),
                        opponentPlayerId: players[6]._id.toString()
                    }
                }
            ]);
            expect(result.teamOne.setPlayPlayers).toHaveLength(5);
            expect(result.teamOne.setPlayPlayers).toEqual(
                expect.arrayContaining([
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
                        playerId: players[5]._id.toString(),
                        extraligaPlayerName: 'Reserve Rider'
                    },
                    {
                        playerId: players[6]._id.toString(),
                        extraligaPlayerName: 'Opponent Rider'
                    }
                ])
            );
            expect(result.teamOne.setPlayDescriptions).toBe(
                'PN - Player One, KB - Player Two, P - Player Three, NCD: Player One, Rezerwa Giełda: Reserve Rider, Spartacus: Player One vs Opponent Rider'
            );
            expect(result.teamTwo).toMatchObject({
                roles: null,
                setPlays: [],
                setPlayPlayers: [],
                setPlayDescriptions: ''
            });
        });
        test('Should return empty set play lists for a missing starting lineup reference or a starting lineup without selected set plays', async () => {
            const [userOne, userTwo] = await UserModel.create([
                createUserData(72),
                createUserData(73)
            ]);
            const players = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' },
                { extraligaPlayerName: 'Player Two' },
                { extraligaPlayerName: 'Player Three' },
                { extraligaPlayerName: 'Player Four' },
                { extraligaPlayerName: 'Player Five' }
            ]);
            const startingLineup = await StartingLineupPlayoffModel.create({
                userId: userTwo._id,
                roundNumber: 1,
                playerOne: players[0]._id,
                playerTwo: players[1]._id,
                playerThree: players[2]._id,
                playerFour: players[3]._id,
                playerFive: players[4]._id,
                roles: {
                    pn: { playerId: players[0]._id, isDisabled: false },
                    kb: players[1]._id,
                    p: players[2]._id
                }
            });
            await SetPlayPlayoffDataModel.create({
                startingLineupId: startingLineup._id
            });
            const schedule = await SchedulePlayoffModel.create({
                userOneId: userOne._id,
                userTwoId: userTwo._id,
                roundNumber: 1,
                userOneSeed: 1,
                userTwoSeed: 4,
                stage: 'semifinal'
            });
            await ScoreDetailsPlayoffModel.create({
                scheduleId: schedule._id,
                roundNumber: 1,
                teamOne: {
                    userId: userOne._id,
                    startingLineupId: new mongoose.Types.ObjectId()
                },
                teamTwo: {
                    userId: userTwo._id,
                    startingLineupId: startingLineup._id
                }
            });
            const result =
                await ScoreDetailsPlayoffModel.getScoreDetailsByScheduleAndRoundId(
                    schedule._id.toString(),
                    1
                );
            expect(result.teamOne).toMatchObject({
                roles: null,
                setPlays: [],
                setPlayPlayers: [],
                setPlayDescriptions: ''
            });
            expect(result.teamTwo.setPlays).toEqual([]);
            expect(result.teamTwo.setPlayDescriptions).toBe(
                'PN - Player One, KB - Player Two, P - Player Three'
            );
        });
    });

    describe('getScoreDetailsForHistory', () => {
        test('Should throw error when there is no playoff score details data', async () => {
            await expect(
                ScoreDetailsPlayoffModel.getScoreDetailsForHistory()
            ).rejects.toThrow('Score details not found');
        });

        test('Should return playoff history with scalar player heats, numeric trainer scores, and formatted set-play descriptions for both teams', async () => {
            const userOne = await new UserModel(createUserData(20)).save();
            const userTwo = await new UserModel(createUserData(21)).save();

            const players = await PlayersModel.create([
                { extraligaPlayerName: 'Playoff Player One' },
                { extraligaPlayerName: 'Playoff Player Two' },
                { extraligaPlayerName: 'Playoff Player Three' },
                { extraligaPlayerName: 'Playoff Player Four' },
                { extraligaPlayerName: 'Playoff Player Five' },
                { extraligaPlayerName: 'Playoff Player Six' },
                { extraligaPlayerName: 'Playoff Player Seven' },
                { extraligaPlayerName: 'Playoff Player Eight' },
                { extraligaPlayerName: 'Playoff Player Nine' },
                { extraligaPlayerName: 'Playoff Player Ten' }
            ]);

            const startingLineupOne = await new StartingLineupPlayoffModel({
                userId: userOne._id.toString(),
                roundNumber: 1,
                playerOne: players[0]._id.toString(),
                playerTwo: players[1]._id.toString(),
                playerThree: players[2]._id.toString(),
                playerFour: players[3]._id.toString(),
                playerFive: players[4]._id.toString(),
                roles: {
                    pn: { playerId: players[0]._id, isDisabled: false },
                    kb: players[1]._id,
                    p: players[2]._id
                }
            }).save();

            const startingLineupTwo = await new StartingLineupPlayoffModel({
                userId: userTwo._id.toString(),
                roundNumber: 1,
                playerOne: players[5]._id.toString(),
                playerTwo: players[6]._id.toString(),
                playerThree: players[7]._id.toString(),
                playerFour: players[8]._id.toString(),
                playerFive: players[9]._id.toString(),
                roles: {
                    pn: { playerId: players[5]._id, isDisabled: false },
                    kb: players[6]._id,
                    p: players[7]._id
                }
            }).save();

            const schedule = await new SchedulePlayoffModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 1,
                userOneScore: 50,
                userTwoScore: 40,
                userOneSeed: 1,
                userTwoSeed: 4,
                stage: 'semifinal'
            }).save();

            const scoreDetailsToCreate: ScoreDetailsPlayoffInputType = {
                scheduleId: schedule._id.toString(),
                roundNumber: 1,
                teamOne: {
                    userId: userOne._id.toString(),
                    players: [
                        {
                            playerId: players[0]._id.toString(),
                            heatOne: {
                                value: 3,
                                bonus: false,
                                isNominated: false
                            },
                            setPlay: 1,
                            comment: 'Playoff solid ride'
                        }
                    ],
                    trainer: {
                        heatOne: 1,
                        setPlay: 0,
                        comment: 'Playoff trainer one'
                    },
                    startingLineupId: startingLineupOne._id.toString()
                },
                teamTwo: {
                    userId: userTwo._id.toString(),
                    players: [
                        {
                            playerId: players[1]._id.toString(),
                            heatOne: {
                                value: 2,
                                bonus: false,
                                isNominated: false
                            },
                            setPlay: 0,
                            comment: 'Playoff strong start'
                        }
                    ],
                    trainer: {
                        heatOne: 0,
                        setPlay: 1,
                        comment: 'Playoff trainer two'
                    },
                    startingLineupId: startingLineupTwo._id.toString()
                }
            };

            await new ScoreDetailsPlayoffModel(scoreDetailsToCreate).save();

            const result =
                await ScoreDetailsPlayoffModel.getScoreDetailsForHistory();

            expect(result).toHaveLength(1);

            const [scoreDetails] = result;

            expect(scoreDetails.teamOne.setPlays).toBe(
                'PN - Playoff Player One, KB - Playoff Player Two, P - Playoff Player Three'
            );
            expect(scoreDetails.teamTwo.setPlays).toBe(
                'PN - Playoff Player Six, KB - Playoff Player Seven, P - Playoff Player Eight'
            );

            expect(scoreDetails.teamOne.trainer?.heatOne).toBe(1);
            expect(scoreDetails.teamOne.trainer?.setPlay).toBe(0);
            expect(scoreDetails.teamOne.trainer?.comment).toBe(
                'Playoff trainer one'
            );

            expect(scoreDetails.teamTwo.trainer?.heatOne).toBe(0);
            expect(scoreDetails.teamTwo.trainer?.setPlay).toBe(1);
            expect(scoreDetails.teamTwo.trainer?.comment).toBe(
                'Playoff trainer two'
            );

            expect(scoreDetails.teamOne.players).toHaveLength(1);
            expect(scoreDetails.teamOne.players[0].playerId?.toString()).toBe(
                players[0]._id.toString()
            );
            expect(scoreDetails.teamOne.players[0].heatOne).toBe(3);
            expect(scoreDetails.teamOne.players[0].setPlay).toBe(1);
            expect(scoreDetails.teamOne.players[0].comment).toBe(
                'Playoff solid ride'
            );

            expect(scoreDetails.teamTwo.players).toHaveLength(1);
            expect(scoreDetails.teamTwo.players[0].playerId?.toString()).toBe(
                players[1]._id.toString()
            );
            expect(scoreDetails.teamTwo.players[0].heatOne).toBe(2);
            expect(scoreDetails.teamTwo.players[0].setPlay).toBe(0);
            expect(scoreDetails.teamTwo.players[0].comment).toBe(
                'Playoff strong start'
            );
        });
        test('Should return empty history summaries for absent or missing starting lineup references', async () => {
            const [userOne, userTwo] = await UserModel.create([
                createUserData(74),
                createUserData(75)
            ]);
            await ScoreDetailsPlayoffModel.create({
                roundNumber: 1,
                teamOne: { userId: userOne._id },
                teamTwo: {
                    userId: userTwo._id,
                    startingLineupId: new mongoose.Types.ObjectId()
                }
            });
            const [result] =
                await ScoreDetailsPlayoffModel.getScoreDetailsForHistory();
            expect(result.teamOne.setPlays).toBe('');
            expect(result.teamTwo.setPlays).toBe('');
        });
    });

    describe('deleteAll', () => {
        test('Should remove all documents from the collection', async () => {
            const userOne = await new UserModel(createUserData(30)).save();
            const userTwo = await new UserModel(createUserData(31)).save();

            await new ScoreDetailsPlayoffModel({
                scheduleId: new mongoose.Types.ObjectId().toString(),
                roundNumber: 1,
                teamOne: { userId: userOne._id.toString() },
                teamTwo: { userId: userTwo._id.toString() }
            }).save();

            await ScoreDetailsPlayoffModel.deleteAll();

            const remainingDocuments =
                await ScoreDetailsPlayoffModel.find().exec();

            expect(remainingDocuments).toHaveLength(0);
        });
    });

    describe('getPlayerScoreDetailsByRoundAndUserId', () => {
        test('Should throw error if roundNumber not in range 1 - 4', async () => {
            const userOne = await new UserModel(createUserData(40)).save();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' }
            ]);

            await expect(
                ScoreDetailsPlayoffModel.getPlayerScoreDetailsByRoundAndUserId(
                    5,
                    userOne._id.toString(),
                    player._id.toString()
                )
            ).rejects.toThrow(
                'Invalid roundNumber: 5. Must be between 1 and 4'
            );
        });

        test('Should throw error if userId does not exist in user collection', async () => {
            const invalidUserId = new mongoose.Types.ObjectId().toString();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' }
            ]);

            await expect(
                ScoreDetailsPlayoffModel.getPlayerScoreDetailsByRoundAndUserId(
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
                ScoreDetailsPlayoffModel.getPlayerScoreDetailsByRoundAndUserId(
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

            const schedule = await new SchedulePlayoffModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 1,
                userOneScore: 46,
                userTwoScore: 44,
                userOneSeed: 1,
                userTwoSeed: 4,
                stage: 'semifinal'
            }).save();

            const scoreDetails = await new ScoreDetailsPlayoffModel({
                scheduleId: schedule._id.toString(),
                roundNumber: 1,
                teamOne: {
                    userId: userOne._id.toString(),
                    players: [
                        {
                            playerId: playerOne._id.toString(),
                            heatOne: {
                                value: 3,
                                bonus: false,
                                isNominated: false
                            },
                            heatTwo: {
                                value: 2,
                                bonus: false,
                                isNominated: false
                            },
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
                            heatOne: {
                                value: 1,
                                bonus: false,
                                isNominated: false
                            },
                            heatTwo: {
                                value: 1,
                                bonus: false,
                                isNominated: false
                            },
                            setPlay: 0,
                            comment: 'Weak ride'
                        }
                    ]
                }
            }).save();

            const result =
                await ScoreDetailsPlayoffModel.getPlayerScoreDetailsByRoundAndUserId(
                    1,
                    userOne._id.toString(),
                    playerOne._id.toString()
                );

            expect(result.scoreDetailsId).toBe(scoreDetails._id.toString());
            expect(result.teamType).toBe('teamOne');
            expect(result.playerScoreDetails.heatOne).toEqual({
                value: 3,
                bonus: false,
                isNominated: false
            });
            expect(result.playerScoreDetails.heatTwo).toEqual({
                value: 2,
                bonus: false,
                isNominated: false
            });
            expect(
                (result.playerScoreDetails as Record<string, unknown>).setPlay
            ).toBeUndefined();
            expect(
                (result.playerScoreDetails as Record<string, unknown>).comment
            ).toBeUndefined();
        });

        test('Should return empty heat inputs for an unsubmitted player without changing stored heat values', async () => {
            const user = await new UserModel(createUserData(45)).save();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Unsubmitted player' }
            ]);
            const document = await ScoreDetailsPlayoffModel.create({
                roundNumber: 1,
                teamOne: {
                    userId: user._id,
                    players: [{ playerId: player._id }]
                },
                teamTwo: { userId: new mongoose.Types.ObjectId(), players: [] }
            });
            const result =
                await ScoreDetailsPlayoffModel.getPlayerScoreDetailsByRoundAndUserId(
                    1,
                    user._id.toString(),
                    player._id.toString()
                );
            expect(result.scoreDetailsId).toBe(document._id.toString());
            expect(result.playerScoreDetails.heatOne).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            const stored = await ScoreDetailsPlayoffModel.findById(document._id)
                .orFail()
                .exec();
            expect(stored.teamOne.players?.[0].heatOne.value).toBeUndefined();
        });

        test('Should return empty heat inputs without saving score details when the player has no scores', async () => {
            const userOne = await new UserModel(createUserData(44)).save();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' }
            ]);

            const result =
                await ScoreDetailsPlayoffModel.getPlayerScoreDetailsByRoundAndUserId(
                    2,
                    userOne._id.toString(),
                    player._id.toString()
                );

            expect(result.scoreDetailsId).toBeNull();
            expect(result.teamType).toBeNull();
            expect(await ScoreDetailsPlayoffModel.countDocuments()).toBe(0);
            expect(result.playerScoreDetails.heatOne).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            expect(result.playerScoreDetails.heatTwo).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            expect(result.playerScoreDetails.heatThree).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            expect(result.playerScoreDetails.heatFour).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            expect(result.playerScoreDetails.heatFive).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            expect(result.playerScoreDetails.heatSix).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            expect(result.playerScoreDetails.heatSeven).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
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
                ScoreDetailsPlayoffModel.savePlayerScoreDetails(playerData, 3, {
                    heatOne: { value: 3, bonus: false, isNominated: false }
                })
            ).rejects.toThrow(
                `Schedule not found for userId: ${userOne._id.toString()} and roundNumber: 3`
            );
        });

        test('Should preserve both teams calculation details while saving player scores', async () => {
            const userOne = await UserModel.create(createUserData(71));
            const userTwo = await UserModel.create(createUserData(72));
            const player = await PlayersModel.create({
                extraligaPlayerName: 'Result rider'
            });
            const schedule = await SchedulePlayoffModel.create({
                userOneId: userOne._id,
                userTwoId: userTwo._id,
                roundNumber: 1,
                userOneSeed: 1,
                userTwoSeed: 4,
                stage: 'semifinal'
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
            await ScoreDetailsPlayoffModel.create(
                scoreDetailsPlayoffZodSchema.parse({
                    scheduleId: schedule._id.toString(),
                    roundNumber: 1,
                    teamOne: team,
                    teamTwo: { ...team, userId: userTwo._id.toString() }
                })
            );

            await ScoreDetailsPlayoffModel.savePlayerScoreDetails(
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

            const savedDocument = await ScoreDetailsPlayoffModel.findOne({
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

            await new SchedulePlayoffModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 4,
                userOneSeed: 1,
                userTwoSeed: 4,
                stage: 'final'
            }).save();

            const playerData = {
                userId: [userOne._id.toString()],
                startingLineupId: [new mongoose.Types.ObjectId().toString()],
                playerId: player!._id.toString(),
                playerName: player!.extraligaPlayerName
            };

            await ScoreDetailsPlayoffModel.savePlayerScoreDetails(
                playerData,
                4,
                { heatFour: { value: 2, bonus: false, isNominated: false } }
            );

            const savedDocument = await ScoreDetailsPlayoffModel.findOne({
                roundNumber: 4
            }).exec();
            const savedPlayer = savedDocument?.teamOne.players?.[0];

            expect(savedDocument?.teamOne.calculationDetails).toBeUndefined();
            expect(savedDocument?.teamTwo.calculationDetails).toBeUndefined();

            expect(savedPlayer?.heatOne).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            expect(savedPlayer?.heatTwo).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            expect(savedPlayer?.heatThree).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            expect(savedPlayer?.heatFour).toEqual({
                value: 2,
                bonus: false,
                isNominated: false
            });
            expect(savedPlayer?.heatFive).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            expect(savedPlayer?.heatSix).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            expect(savedPlayer?.heatSeven).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
        });

        test('Should create score details document and save player under teamOne when userId matches schedule userOneId', async () => {
            const userOne = await new UserModel(createUserData(51)).save();
            const userTwo = await new UserModel(createUserData(52)).save();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' }
            ]);

            const schedule = await new SchedulePlayoffModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 1,
                userOneSeed: 1,
                userTwoSeed: 4,
                stage: 'semifinal'
            }).save();

            const startingLineupId = new mongoose.Types.ObjectId().toString();
            const playerData = {
                userId: [userOne._id.toString()],
                startingLineupId: [startingLineupId],
                playerId: player!._id.toString(),
                playerName: player!.extraligaPlayerName
            };

            const result =
                await ScoreDetailsPlayoffModel.savePlayerScoreDetails(
                    playerData,
                    1,
                    {
                        heatOne: { value: 3, bonus: false, isNominated: false },
                        heatTwo: { value: 2, bonus: false, isNominated: false }
                    }
                );

            expect(result).toEqual({ success: true });

            const savedDocument = await ScoreDetailsPlayoffModel.findOne({
                scheduleId: schedule._id.toString(),
                roundNumber: 1
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
            expect(savedDocument?.teamOne.players?.[0]?.heatOne).toEqual({
                value: 3,
                bonus: false,
                isNominated: false
            });
            expect(savedDocument?.teamOne.players?.[0]?.heatTwo).toEqual({
                value: 2,
                bonus: false,
                isNominated: false
            });
            expect(savedDocument?.teamOne.players?.[0]?.heatThree).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            expect(savedDocument?.teamOne.players?.[0]?.heatSeven).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
        });

        test('Should save player under teamTwo when userId matches schedule userTwoId', async () => {
            const userOne = await new UserModel(createUserData(53)).save();
            const userTwo = await new UserModel(createUserData(54)).save();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' }
            ]);

            await new SchedulePlayoffModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 2,
                userOneSeed: 1,
                userTwoSeed: 4,
                stage: 'semifinal'
            }).save();

            const startingLineupId = new mongoose.Types.ObjectId().toString();
            const playerData = {
                userId: [userTwo._id.toString()],
                startingLineupId: [startingLineupId],
                playerId: player!._id.toString(),
                playerName: player!.extraligaPlayerName
            };

            await ScoreDetailsPlayoffModel.savePlayerScoreDetails(
                playerData,
                2,
                { heatThree: { value: 1, bonus: false, isNominated: false } }
            );

            const savedDocument = await ScoreDetailsPlayoffModel.findOne({
                roundNumber: 2
            }).exec();

            expect(savedDocument?.teamTwo.userId?.toString()).toBe(
                userTwo._id.toString()
            );
            expect(savedDocument?.teamTwo.players?.[0]?.heatThree).toEqual({
                value: 1,
                bonus: false,
                isNominated: false
            });
            expect(savedDocument?.teamTwo.players?.[0]?.heatOne).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            expect(savedDocument?.teamTwo.players?.[0]?.heatTwo).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
        });

        test('Should preserve heat values and flags when editing, clearing and resubmitting without duplicating the player', async () => {
            const userOne = await new UserModel(createUserData(55)).save();
            const userTwo = await new UserModel(createUserData(56)).save();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' }
            ]);

            await new SchedulePlayoffModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 3,
                userOneSeed: 1,
                userTwoSeed: 3,
                stage: 'final'
            }).save();

            const playerData = {
                userId: [userOne._id.toString()],
                startingLineupId: [new mongoose.Types.ObjectId().toString()],
                playerId: player!._id.toString(),
                playerName: player!.extraligaPlayerName
            };

            await ScoreDetailsPlayoffModel.savePlayerScoreDetails(
                playerData,
                3,
                {
                    heatOne: { value: 0, bonus: false, isNominated: true },
                    heatTwo: { value: 2, bonus: false, isNominated: false }
                }
            );
            const first =
                await ScoreDetailsPlayoffModel.getPlayerScoreDetailsByRoundAndUserId(
                    3,
                    userOne._id.toString(),
                    player._id.toString()
                );
            expect(first.playerScoreDetails.heatOne).toEqual({
                value: 0,
                bonus: false,
                isNominated: true
            });

            const editedScores = {
                heatOne: { value: 3, bonus: false, isNominated: false },
                heatTwo: { value: 2, bonus: true, isNominated: true }
            };
            await ScoreDetailsPlayoffModel.savePlayerScoreDetails(
                playerData,
                3,
                editedScores
            );
            const edited =
                await ScoreDetailsPlayoffModel.getPlayerScoreDetailsByRoundAndUserId(
                    3,
                    userOne._id.toString(),
                    player._id.toString()
                );
            expect(edited.playerScoreDetails).toMatchObject(editedScores);

            await ScoreDetailsPlayoffModel.savePlayerScoreDetails(
                playerData,
                3,
                {
                    heatOne: { bonus: false, isNominated: false },
                    heatTwo: { value: null, bonus: false, isNominated: false }
                }
            );
            const cleared =
                await ScoreDetailsPlayoffModel.getPlayerScoreDetailsByRoundAndUserId(
                    3,
                    userOne._id.toString(),
                    player._id.toString()
                );
            expect(cleared.playerScoreDetails.heatOne).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            expect(cleared.playerScoreDetails.heatTwo).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            await ScoreDetailsPlayoffModel.savePlayerScoreDetails(
                playerData,
                3,
                cleared.playerScoreDetails
            );
            expect(
                await ScoreDetailsPlayoffModel.getPlayerScoreDetailsByRoundAndUserId(
                    3,
                    userOne._id.toString(),
                    player._id.toString()
                )
            ).toEqual(cleared);

            const savedDocument = await ScoreDetailsPlayoffModel.findOne({
                roundNumber: 3
            }).exec();
            expect(savedDocument?.teamOne.players).toHaveLength(1);
        });

        test('Should save score details for a player assigned to two different users across two schedules', async () => {
            const userOne = await new UserModel(createUserData(57)).save();
            const userTwo = await new UserModel(createUserData(58)).save();
            const userThree = await new UserModel(createUserData(59)).save();
            const userFour = await new UserModel(createUserData(60)).save();
            const [player] = await PlayersModel.create([
                { extraligaPlayerName: 'Shared Player' }
            ]);

            await new SchedulePlayoffModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 1,
                userOneSeed: 1,
                userTwoSeed: 4,
                stage: 'semifinal'
            }).save();
            await new SchedulePlayoffModel({
                userOneId: userThree._id.toString(),
                userTwoId: userFour._id.toString(),
                roundNumber: 1,
                userOneSeed: 2,
                userTwoSeed: 3,
                stage: 'semifinal'
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

            const result =
                await ScoreDetailsPlayoffModel.savePlayerScoreDetails(
                    playerData,
                    1,
                    { heatOne: { value: 5, bonus: false, isNominated: false } }
                );

            expect(result).toEqual({ success: true });

            const savedDocuments = await ScoreDetailsPlayoffModel.find({
                roundNumber: 1
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

            expect(documentForUserOne?.teamOne.players?.[0]?.heatOne).toEqual({
                value: 5,
                bonus: false,
                isNominated: false
            });
            expect(documentForUserFour?.teamTwo.players?.[0]?.heatOne).toEqual({
                value: 5,
                bonus: false,
                isNominated: false
            });
            expect(documentForUserOne?.teamOne.players?.[0]?.heatTwo).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
            expect(documentForUserFour?.teamTwo.players?.[0]?.heatTwo).toEqual({
                value: null,
                bonus: false,
                isNominated: false
            });
        });
    });
    describe('isScoreCalculationsEnabled', () => {
        test.each([0, 5])(
            'Should reject playoff round %i outside 1 - 4',
            async roundNumber => {
                await expect(
                    ScoreDetailsPlayoffModel.isScoreCalculationsEnabled(
                        roundNumber
                    )
                ).rejects.toThrow(
                    `Invalid roundNumber: ${roundNumber}. Must be between 1 and 4`
                );
            }
        );
        test('Should return false when fewer than two matches have scores', async () => {
            const fixture = await createPlayoffRound();
            await ScoreDetailsPlayoffModel.deleteOne({
                _id: fixture.documents[1]._id
            });
            expect(
                await ScoreDetailsPlayoffModel.isScoreCalculationsEnabled(1)
            ).toBe(false);
        });
        test.each(['missing rider', 'unsubmitted heat'])(
            'Should return false for %s in the second playoff match',
            async kind => {
                const fixture = await createPlayoffRound();
                if (kind === 'missing rider') {
                    await ScoreDetailsPlayoffModel.updateOne(
                        { _id: fixture.documents[1]._id },
                        { $pop: { 'teamTwo.players': 1 } }
                    );
                } else {
                    await ScoreDetailsPlayoffModel.updateOne(
                        { _id: fixture.documents[1]._id },
                        { $unset: { 'teamTwo.players.4.heatSeven.value': 1 } }
                    );
                }
                expect(
                    await ScoreDetailsPlayoffModel.isScoreCalculationsEnabled(1)
                ).toBe(false);
            }
        );
        test.each([1, 4])(
            'Should return true for two complete matches in playoff round %i with saved zeros and nulls',
            async roundNumber => {
                await createPlayoffRound(roundNumber);
                expect(
                    await ScoreDetailsPlayoffModel.isScoreCalculationsEnabled(
                        roundNumber
                    )
                ).toBe(true);
            }
        );
    });

    describe('calculateScoresByRound', () => {
        test.each([0, 5])(
            'Should reject playoff round %i outside 1 - 4',
            async roundNumber => {
                await expect(
                    ScoreDetailsPlayoffModel.calculateScoresByRound(roundNumber)
                ).rejects.toThrow(
                    `Invalid roundNumber: ${roundNumber}. Must be between 1 and 4`
                );
            }
        );
        test('Should reject incomplete scores before updating any match', async () => {
            await expect(
                ScoreDetailsPlayoffModel.calculateScoresByRound(1)
            ).rejects.toThrow('Score details are incomplete for round: 1');
        });
        test('Should reject calculation when the current season is missing', async () => {
            await createPlayoffRound();
            await expect(
                ScoreDetailsPlayoffModel.calculateScoresByRound(1)
            ).rejects.toThrow('Current season not found');
        });
        const scheduleErrorCases: PlayoffCalculationErrorCaseType[] = [
            {
                scenario: 'a schedule with incorrect participants',
                invalidate: async (_fixture, document) => {
                    await SchedulePlayoffModel.updateOne(
                        { _id: document.scheduleId },
                        { userOneId: document.teamTwo.userId }
                    );
                    return `Invalid schedule for score details: ${document._id}`;
                }
            },
            {
                scenario: 'incomplete schedule coverage',
                invalidate: async (_fixture, document) => {
                    await SchedulePlayoffModel.deleteOne({
                        _id: document.scheduleId
                    });
                    return 'Schedule coverage is incomplete for round: 1';
                }
            },
            {
                scenario: 'duplicate schedule coverage',
                invalidate: async (fixture, document) => {
                    const otherSchedule = fixture.schedules.find(schedule => {
                        return (
                            schedule._id.toString() !==
                            document.scheduleId?.toString()
                        );
                    });
                    await ScoreDetailsPlayoffModel.updateOne(
                        { _id: document._id },
                        { scheduleId: otherSchedule!._id }
                    );
                    return 'Schedule coverage is incomplete for round: 1';
                }
            },
            {
                scenario: 'extra score details',
                invalidate: async (_fixture, document) => {
                    await ScoreDetailsPlayoffModel.create({
                        ...document.toObject(),
                        _id: new mongoose.Types.ObjectId()
                    });
                    return 'Schedule coverage is incomplete for round: 1';
                }
            }
        ];
        const startingLineupErrorCases: PlayoffCalculationErrorCaseType[] = [
            {
                scenario: 'a missing starting lineup',
                invalidate: async (_fixture, document) => {
                    await StartingLineupPlayoffModel.deleteOne({
                        _id: document.teamOne.startingLineupId
                    });
                    return `Invalid starting lineup for user: ${document.teamOne.userId}`;
                }
            },
            {
                scenario: 'a starting lineup owned by another user',
                invalidate: async (_fixture, document) => {
                    await StartingLineupPlayoffModel.updateOne(
                        { _id: document.teamOne.startingLineupId },
                        { userId: document.teamTwo.userId }
                    );
                    return `Invalid starting lineup for user: ${document.teamOne.userId}`;
                }
            },
            {
                scenario: 'a starting lineup for another round',
                invalidate: async (_fixture, document) => {
                    await StartingLineupPlayoffModel.updateOne(
                        { _id: document.teamOne.startingLineupId },
                        { roundNumber: 2 }
                    );
                    return `Invalid starting lineup for user: ${document.teamOne.userId}`;
                }
            },
            {
                scenario: 'duplicate starting lineup positions',
                invalidate: async (fixture, document) => {
                    await StartingLineupPlayoffModel.updateOne(
                        { _id: document.teamOne.startingLineupId },
                        { playerFive: fixture.players[0]._id }
                    );
                    return `Starting lineup players do not match score details for user: ${document.teamOne.userId}`;
                }
            },
            {
                scenario: 'a starting lineup player missing from score details',
                invalidate: async (fixture, document) => {
                    await StartingLineupPlayoffModel.updateOne(
                        { _id: document.teamOne.startingLineupId },
                        { playerFive: fixture.players[5]._id }
                    );
                    return `Starting lineup players do not match score details for user: ${document.teamOne.userId}`;
                }
            },
            {
                scenario: 'missing player metadata',
                invalidate: async (_fixture, document) => {
                    const missingId = new mongoose.Types.ObjectId();
                    await StartingLineupPlayoffModel.updateOne(
                        { _id: document.teamOne.startingLineupId },
                        { playerOne: missingId }
                    );
                    await ScoreDetailsPlayoffModel.updateOne(
                        { _id: document._id },
                        { 'teamOne.players.0.playerId': missingId }
                    );
                    return `Missing player: ${missingId}`;
                }
            },
            {
                scenario: 'a missing team user',
                invalidate: async (_fixture, document) => {
                    await UserModel.deleteOne({ _id: document.teamTwo.userId });
                    return 'Missing team user for round: 1';
                }
            }
        ];
        const setPlayErrorCases: PlayoffCalculationErrorCaseType[] = [
            {
                scenario: 'missing replacement metadata',
                invalidate: async (fixture, document) => {
                    const setPlay = await SetPlaysModel.create({
                        name: 'Awatar',
                        type: SetPlayEnumType.Awatar
                    });
                    const missingId = new mongoose.Types.ObjectId().toString();
                    await SetPlayPlayoffDataModel.collection.insertOne({
                        startingLineupId: document.teamOne.startingLineupId,
                        setPlayList: [
                            {
                                _id: new mongoose.Types.ObjectId(),
                                setPlayId: setPlay._id,
                                userData: {
                                    playerId: missingId,
                                    replacedPlayerId:
                                        fixture.players[0]._id.toString()
                                },
                                adminData: {
                                    ...playerScoresZodSchema.parse({}),
                                    isDisabled: false
                                }
                            }
                        ]
                    });
                    return `Missing replacement player data: ${missingId}`;
                }
            },
            {
                scenario: 'missing set play admin data',
                invalidate: async (fixture, document) => {
                    const setPlay = await SetPlaysModel.create({
                        name: 'NCD',
                        type: SetPlayEnumType.Ncd
                    });
                    await SetPlayPlayoffDataModel.collection.insertOne({
                        startingLineupId: document.teamOne.startingLineupId,
                        setPlayList: [
                            {
                                _id: new mongoose.Types.ObjectId(),
                                setPlayId: setPlay._id,
                                userData: {
                                    playerId: fixture.players[0]._id.toString()
                                }
                            }
                        ]
                    });
                    return 'NCD admin data is required for score calculation';
                }
            },
            {
                scenario: 'an invalid KFN interval',
                invalidate: async (_fixture, document) => {
                    const setPlay = await SetPlaysModel.create({
                        name: 'KFN',
                        type: SetPlayEnumType.KoloFortunyNorbiego
                    });
                    await SetPlayPlayoffDataModel.collection.insertOne({
                        startingLineupId: document.teamOne.startingLineupId,
                        setPlayList: [
                            {
                                _id: new mongoose.Types.ObjectId(),
                                setPlayId: setPlay._id,
                                userData: { minimum: 0, maximum: 22 }
                            }
                        ]
                    });
                    return 'Invalid KFN interval: 0-22';
                }
            }
        ];
        test.each([
            ...scheduleErrorCases,
            ...startingLineupErrorCases,
            ...setPlayErrorCases
        ])(
            'Should reject $scenario before saving either playoff match',
            async ({ invalidate }) => {
                const fixture = await createPlayoffRound();
                const season = await SeasonOpsModel.create({
                    name: '2026',
                    isCurrentSeason: true,
                    numberOfGroups: 1
                });
                // Match the calculator's lookup order instead of assuming creation order.
                const [firstDocument, lastDocument] =
                    await ScoreDetailsPlayoffModel.find({
                        roundNumber: 1
                    }).exec();
                const expected = await invalidate(fixture, lastDocument);
                await expect(
                    ScoreDetailsPlayoffModel.calculateScoresByRound(1)
                ).rejects.toThrow(expected);
                expect(
                    (
                        await SchedulePlayoffModel.findById(
                            firstDocument.scheduleId
                        )
                    )?.userOneScore
                ).toBe(99);
                expect(
                    (
                        await ScoreDetailsPlayoffModel.findById(
                            firstDocument._id
                        )
                    )?.teamOne.trainer?.comment
                ).toBeUndefined();
                expect(
                    (await SeasonOpsModel.findById(season._id).exec())
                        ?.isScoreCalculatdedPlayoff[1]
                ).toBe(false);
            }
        );
        test.each(['score details', 'schedule'])(
            'Should propagate a %s write failure without marking the playoff round calculated',
            async kind => {
                await createPlayoffRound();
                const season = await SeasonOpsModel.create({
                    name: '2026',
                    isCurrentSeason: true,
                    numberOfGroups: 1
                });
                const write =
                    kind === 'score details'
                        ? jest
                              .spyOn(ScoreDetailsPlayoffModel.prototype, 'save')
                              .mockImplementationOnce(() => {
                                  throw new Error('Write failed');
                              })
                        : jest
                              .spyOn(SchedulePlayoffModel, 'updateOne')
                              .mockImplementationOnce(() => {
                                  throw new Error('Write failed');
                              });
                try {
                    await expect(
                        ScoreDetailsPlayoffModel.calculateScoresByRound(1)
                    ).rejects.toThrow('Write failed');
                    expect(
                        (await SeasonOpsModel.findById(season._id).exec())
                            ?.isScoreCalculatdedPlayoff[1]
                    ).toBe(false);
                } finally {
                    write.mockRestore();
                }
            }
        );
        test.each([1, 4])(
            'Should calculate both playoff matches in round %i and replace derived results after a score correction',
            async roundNumber => {
                const fixture = await createPlayoffRound(roundNumber);
                const otherRound = roundNumber === 1 ? 4 : 1;
                const other = await createPlayoffRound(otherRound);
                const season = await SeasonOpsModel.create({
                    name: '2026',
                    isCurrentSeason: true,
                    numberOfGroups: 1,
                    isScoreCalculatdedPlayoff: { 2: true },
                    isScoreCalculatded: { 1: true }
                });
                const regularSchedule = await ScheduleModel.create({
                    roundNumber,
                    userOneId: fixture.users[0]._id,
                    userTwoId: fixture.users[1]._id,
                    userOneScore: 88,
                    userTwoScore: 87
                });
                const regularDocument = await ScoreDetailsModel.create({
                    scheduleId: regularSchedule._id,
                    roundNumber,
                    teamOne: { userId: fixture.users[0]._id },
                    teamTwo: { userId: fixture.users[1]._id }
                });
                const replacement = await PlayersModel.create({
                    extraligaPlayerName: 'Awatar replacement',
                    isJunior: true
                });
                const definitions = await SetPlaysModel.create([
                    { name: 'Awatar', type: SetPlayEnumType.Awatar },
                    { name: 'Spartacus', type: SetPlayEnumType.Spartacus },
                    { name: 'Muchomor', type: SetPlayEnumType.Muchomor },
                    { name: 'NCD6', type: SetPlayEnumType.Ncd6 }
                ]);
                await SetPlayPlayoffDataModel.create({
                    startingLineupId: fixture.startingLineups[0]._id,
                    setPlayList: [
                        {
                            setPlayId: definitions[0]._id,
                            userData: {
                                playerId: replacement._id.toString(),
                                replacedPlayerId:
                                    fixture.players[0]._id.toString()
                            },
                            adminData: {
                                ...playerScoresZodSchema.parse({
                                    heatOne: { value: 2, isNominated: true }
                                }),
                                isDisabled: false,
                                isMatchDraw: false
                            }
                        },
                        {
                            setPlayId: definitions[1]._id,
                            userData: {
                                ownPlayerId: fixture.players[3]._id.toString(),
                                opponentPlayerId:
                                    fixture.players[8]._id.toString()
                            },
                            adminData: { ownAverage: 1, opponentAverage: 2 }
                        },
                        { setPlayId: definitions[2]._id }
                    ]
                });
                await SetPlayPlayoffDataModel.create({
                    startingLineupId: fixture.startingLineups[1]._id,
                    setPlayList: [
                        {
                            setPlayId: definitions[3]._id,
                            userData: {
                                playerId: fixture.players[8]._id.toString()
                            },
                            adminData: {
                                playerIdList: fixture.players
                                    .slice(0, 4)
                                    .map(player => player._id.toString())
                            }
                        }
                    ]
                });
                await ScoreDetailsPlayoffModel.updateOne(
                    { _id: fixture.documents[0]._id },
                    {
                        $set: {
                            'teamOne.players.3.heatOne': {
                                value: 3,
                                bonus: true,
                                isNominated: true
                            }
                        }
                    }
                );
                const otherSnapshot = await ScoreDetailsPlayoffModel.find({
                    roundNumber: otherRound
                }).lean();
                const regularSnapshot = await ScoreDetailsModel.findById(
                    regularDocument._id
                ).lean();
                await ScoreDetailsPlayoffModel.calculateScoresByRound(
                    roundNumber
                );
                let saved =
                    await ScoreDetailsPlayoffModel.getScoreDetailsByScheduleAndRoundId(
                        fixture.schedules[0]._id.toString(),
                        roundNumber
                    );
                expect(saved.userOneScore).toBe(16);
                expect(saved.userTwoScore).toBe(0);
                expect(saved.teamOne.players[0].setPlay).toBe(4);
                expect(saved.teamOne.players[0].comment).toBe(
                    'Lider 0, PN 2, Awatar +2'
                );
                expect(saved.teamOne.players[0].heatOne).toEqual({
                    value: 0,
                    bonus: false,
                    isNominated: false
                });
                expect(saved.teamOne.players[3].comment).toBe('Spartacus 3');
                expect(saved.teamOne.players[3].heatOne).toEqual({
                    value: 3,
                    bonus: true,
                    isNominated: true
                });
                expect(saved.teamOne.trainer).toMatchObject({
                    heatOne: 2,
                    setPlay: 4,
                    comment: 'Muchomor 4'
                });
                expect(saved.teamTwo.players[3]).toMatchObject({
                    setPlay: -2,
                    comment: 'NCD6 -2'
                });
                const secondMatch =
                    await ScoreDetailsPlayoffModel.getScoreDetailsByScheduleAndRoundId(
                        fixture.schedules[1]._id.toString(),
                        roundNumber
                    );
                expect(secondMatch.userOneScore).toBe(0);
                expect(secondMatch.userTwoScore).toBe(0);
                expect(secondMatch.teamOne.players[0].comment).toBe(
                    'Lider 0, PN 0'
                );
                expect(secondMatch.teamTwo.trainer).toMatchObject({
                    heatOne: 0,
                    setPlay: 0,
                    comment: ''
                });
                const calculatedSeason = await SeasonOpsModel.findById(
                    season._id
                ).exec();
                expect(calculatedSeason?.isScoreCalculatdedPlayoff).toEqual({
                    1: roundNumber === 1,
                    2: true,
                    3: false,
                    4: roundNumber === 4
                });
                expect(calculatedSeason?.isScoreCalculatded).toMatchObject({
                    1: true,
                    4: false
                });
                await ScoreDetailsPlayoffModel.updateOne(
                    { _id: fixture.documents[0]._id },
                    {
                        $set: {
                            'teamOne.players.3.heatOne': {
                                value: 0,
                                bonus: false,
                                isNominated: false
                            }
                        }
                    }
                );
                await ScoreDetailsPlayoffModel.calculateScoresByRound(
                    roundNumber
                );
                saved =
                    await ScoreDetailsPlayoffModel.getScoreDetailsByScheduleAndRoundId(
                        fixture.schedules[0]._id.toString(),
                        roundNumber
                    );
                expect(saved.userOneScore).toBe(10);
                expect(saved.teamOne.players[3]).toMatchObject({
                    setPlay: 0,
                    comment: 'Spartacus 0'
                });
                expect(saved.teamOne.players[0].setPlay).toBe(4);
                expect(
                    await ScoreDetailsPlayoffModel.find({
                        roundNumber: otherRound
                    }).lean()
                ).toEqual(otherSnapshot);
                expect(
                    await ScoreDetailsModel.findById(regularDocument._id).lean()
                ).toEqual(regularSnapshot);
                expect(
                    (await ScheduleModel.findById(regularSchedule._id))
                        ?.userOneScore
                ).toBe(88);
                expect(
                    (
                        await SchedulePlayoffModel.findById(
                            other.schedules[0]._id
                        )
                    )?.userOneScore
                ).toBe(99);
            }
        );
    });
});
