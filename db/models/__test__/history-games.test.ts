import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import ScheduleModel from '@/db/models/games/schedule';
import SchedulePlayoffModel from '@/db/models/games/schedule-playoff';
import ScoreDetailsModel from '@/db/models/games/score-details';
import ScoreDetailsPlayoffModel from '@/db/models/games/score-details-playoff';
import StartingLineupModel from '@/db/models/games/starting-lineup';
import StartingLineupPlayoffModel from '@/db/models/games/starting-lineup-playoff';
import HistoryGamesModel, {
    HistoryGamesType,
    UserSeasonGamesByStageReturnType
} from '@/db/models/history/history-games';
import HistoryGamesScoreDetailsModel from '@/db/models/history/history-games-score-details';
import HistoryTeamModel, {
    HistoryTeamType
} from '@/db/models/history/history-team';
import LigueGroupsModel from '@/db/models/ligue-groups';
import PlayersModel from '@/db/models/players';
import SeasonOpsModel, { SeasonOpsType } from '@/db/models/season-ops';
import UserModel, { UserType } from '@/db/models/user';

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

beforeEach(async () => {
    await HistoryGamesModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await SeasonOpsModel.deleteMany();
    await ScheduleModel.deleteMany();
    await SchedulePlayoffModel.deleteMany();
    await ScoreDetailsModel.deleteMany();
    await ScoreDetailsPlayoffModel.deleteMany();
    await StartingLineupModel.deleteMany();
    await StartingLineupPlayoffModel.deleteMany();
    await HistoryGamesScoreDetailsModel.deleteMany();
    await PlayersModel.deleteMany();
    await UserModel.deleteMany();
    await LigueGroupsModel.deleteMany();
});

afterAll(async () => {
    await HistoryGamesModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await SeasonOpsModel.deleteMany();
    await ScheduleModel.deleteMany();
    await SchedulePlayoffModel.deleteMany();
    await ScoreDetailsModel.deleteMany();
    await ScoreDetailsPlayoffModel.deleteMany();
    await StartingLineupModel.deleteMany();
    await StartingLineupPlayoffModel.deleteMany();
    await HistoryGamesScoreDetailsModel.deleteMany();
    await PlayersModel.deleteMany();
    await UserModel.deleteMany();
    await LigueGroupsModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test HistoryGamesModel methods and static functions', () => {
    const createSeasonData = (
        name: string,
        overrides: Partial<SeasonOpsType> = {}
    ): SeasonOpsType => ({
        name,
        isCurrentSeason: false,
        numberOfGroups: 2,
        showGroupNames: false,
        isScoreCalculatded: {
            1: false,
            2: false,
            3: false,
            4: false,
            5: false,
            6: false,
            7: false,
            8: false,
            9: false,
            10: false,
            11: false,
            12: false,
            13: false,
            14: false
        },
        isScoreCalculatdedPlayoff: {
            1: false,
            2: false,
            3: false,
            4: false
        },
        ...overrides
    });

    const createHistoryTeamData = (
        historyId: string,
        overrides: Partial<HistoryTeamType> = {}
    ): HistoryTeamType => ({
        historyId,
        name: 'Default Team',
        coachName: 'Default Coach',
        logoUrl: 'https://example.com/default-team.png',
        ...overrides
    });

    test('should throw error if seasonId is not valid', async () => {
        const user = await HistoryTeamModel.create(
            createHistoryTeamData(new mongoose.Types.ObjectId().toString())
        );
        const fakeSeasonId = new mongoose.Types.ObjectId().toString();

        await expect(
            HistoryGamesModel.getUserSeasonGamesByStage(
                fakeSeasonId,
                user._id.toString(),
                'regularSeason'
            )
        ).rejects.toThrow(`Invalid seasonId: ${fakeSeasonId}`);
    });

    test('should throw error if userId is not valid', async () => {
        const season = await SeasonOpsModel.create(createSeasonData('2024'));
        const fakeUserId = new mongoose.Types.ObjectId().toString();

        await expect(
            HistoryGamesModel.getUserSeasonGamesByStage(
                season._id.toString(),
                fakeUserId,
                'regularSeason'
            )
        ).rejects.toThrow(`Invalid userId: ${fakeUserId}`);
    });

    test('should throw error if no documents found', async () => {
        const season = await SeasonOpsModel.create(createSeasonData('2024'));
        const user = await HistoryTeamModel.create(
            createHistoryTeamData(new mongoose.Types.ObjectId().toString(), {
                name: 'Team A'
            })
        );

        await expect(
            HistoryGamesModel.getUserSeasonGamesByStage(
                season._id.toString(),
                user._id.toString(),
                'regularSeason'
            )
        ).rejects.toThrow(
            `No games found for seasonId: ${season._id.toString()}, userId: ${user._id.toString()}, stage: regularSeason`
        );
    });

    test('should get proper list of games for given season', async () => {
        const season = await SeasonOpsModel.create(createSeasonData('2024'));

        const teams = await HistoryTeamModel.create([
            createHistoryTeamData(new mongoose.Types.ObjectId().toString(), {
                name: 'Team A',
                logoUrl: 'https://example.com/team-a.png'
            }),
            createHistoryTeamData(new mongoose.Types.ObjectId().toString(), {
                name: 'Team B',
                logoUrl: 'https://example.com/team-b.png'
            }),
            createHistoryTeamData(new mongoose.Types.ObjectId().toString(), {
                name: 'Team C',
                logoUrl: 'https://example.com/team-c.png'
            })
        ]);

        const historyGamesDoc: HistoryGamesType = {
            season: season._id.toString(),
            games: [
                {
                    teamOne: {
                        teamId: teams[0]._id.toString(),
                        score: 46
                    },
                    teamTwo: {
                        teamId: teams[1]._id.toString(),
                        score: 44
                    },
                    roundNumber: 1,
                    stage: 'regularSeason',
                    scoreDetails: new mongoose.Types.ObjectId().toString()
                },
                {
                    teamOne: {
                        teamId: teams[2]._id.toString(),
                        score: 43
                    },
                    teamTwo: {
                        teamId: teams[0]._id.toString(),
                        score: 47
                    },
                    roundNumber: 2,
                    stage: 'regularSeason',
                    scoreDetails: new mongoose.Types.ObjectId().toString()
                }
            ]
        };

        await HistoryGamesModel.create(historyGamesDoc);

        const result: UserSeasonGamesByStageReturnType[] =
            await HistoryGamesModel.getUserSeasonGamesByStage(
                season._id.toString(),
                teams[0]._id.toString(),
                'regularSeason'
            );

        expect(result).toHaveLength(2);

        expect(result[0]).toEqual(
            expect.objectContaining({
                roundNumber: 1,
                teamOne: {
                    teamName: 'Team A',
                    logoUrl: 'https://example.com/team-a.png',
                    score: 46
                },
                teamTwo: {
                    teamName: 'Team B',
                    logoUrl: 'https://example.com/team-b.png',
                    score: 44
                }
            })
        );

        expect(result[1]).toEqual(
            expect.objectContaining({
                roundNumber: 2,
                teamOne: {
                    teamName: 'Team C',
                    logoUrl: 'https://example.com/team-c.png',
                    score: 43
                },
                teamTwo: {
                    teamName: 'Team A',
                    logoUrl: 'https://example.com/team-a.png',
                    score: 47
                }
            })
        );
    });

    const createUserData = (
        index: number,
        overrides: Partial<UserType> = {}
    ): UserType => ({
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
        isAdmin: false,
        ...overrides
    });

    describe('saveScheduleToHistory', () => {
        test('should throw error if await ScheduleModel.getScheduleForHistory() will not return data', async () => {
            const seasonId = new mongoose.Types.ObjectId().toString();

            await expect(
                HistoryGamesModel.saveScheduleToHistory(seasonId)
            ).rejects.toThrow('Schedule not found');
        });

        test('should throw error if await HistoryTeamModel.getHistoryTeamIdByNameAndCoachName will not return data', async () => {
            const ligueGroup = await new LigueGroupsModel({
                groupName: 'dolce'
            }).save();

            const [userOne, userTwo] = await UserModel.create([
                createUserData(0, { groupName: ligueGroup._id.toString() }),
                createUserData(1, { groupName: ligueGroup._id.toString() })
            ]);

            const schedule = await ScheduleModel.create({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 1,
                ligueGroupsId: ligueGroup._id.toString(),
                userOneScore: 44,
                userTwoScore: 40
            });

            await ScoreDetailsModel.create({
                scheduleId: schedule._id.toString(),
                roundNumber: 1,
                teamOne: { userId: userOne._id.toString() },
                teamTwo: { userId: userTwo._id.toString() }
            });

            const seasonId = new mongoose.Types.ObjectId().toString();

            // no matching HistoryTeam document created for this user's teamName/coachName
            await expect(
                HistoryGamesModel.saveScheduleToHistory(seasonId)
            ).rejects.toThrow(
                `History team not found for name: ${userOne.teamName} and coachName: ${userOne.coachName}`
            );
        });

        test('should properly create a document with history games data with correct type and values', async () => {
            const ligueGroup = await new LigueGroupsModel({
                groupName: 'dolce'
            }).save();

            const [userOne, userTwo, userThree] = await UserModel.create([
                createUserData(0, {
                    teamName: 'Team Alpha',
                    coachName: 'Coach Alpha',
                    groupName: ligueGroup._id.toString()
                }),
                createUserData(1, {
                    teamName: 'Team Beta',
                    coachName: 'Coach Beta',
                    groupName: ligueGroup._id.toString()
                }),
                createUserData(2, {
                    teamName: 'Team Gamma',
                    coachName: 'Coach Gamma',
                    groupName: ligueGroup._id.toString()
                })
            ]);

            const players = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' },
                { extraligaPlayerName: 'Player Two' },
                { extraligaPlayerName: 'Player Three' },
                { extraligaPlayerName: 'Player Four' },
                { extraligaPlayerName: 'Player Five' }
            ]);

            const [scheduleOne, scheduleTwo] = await ScheduleModel.create([
                {
                    userOneId: userOne._id.toString(),
                    userTwoId: userTwo._id.toString(),
                    roundNumber: 1,
                    ligueGroupsId: ligueGroup._id.toString(),
                    userOneScore: 44,
                    userTwoScore: 40
                },
                {
                    userOneId: userThree._id.toString(),
                    userTwoId: userOne._id.toString(),
                    roundNumber: 2,
                    ligueGroupsId: ligueGroup._id.toString(),
                    userOneScore: 38,
                    userTwoScore: 50
                }
            ]);

            const [startingLineupOne, startingLineupTwo] =
                await StartingLineupModel.create([
                    {
                        userId: userOne._id.toString(),
                        roundNumber: 1,
                        setPlays: 'team-one-setplay',
                        playerOne: players[0]._id.toString(),
                        playerTwo: players[1]._id.toString(),
                        playerThree: players[2]._id.toString(),
                        playerFour: players[3]._id.toString(),
                        playerFive: players[4]._id.toString()
                    },
                    {
                        userId: userTwo._id.toString(),
                        roundNumber: 1,
                        setPlays: 'team-two-setplay',
                        playerOne: players[0]._id.toString(),
                        playerTwo: players[1]._id.toString(),
                        playerThree: players[2]._id.toString(),
                        playerFour: players[3]._id.toString(),
                        playerFive: players[4]._id.toString()
                    }
                ]);
            const [startingLineupThree, startingLineupFour] =
                await StartingLineupModel.create([
                    {
                        userId: userThree._id.toString(),
                        roundNumber: 2,
                        setPlays: 'team-three-setplay',
                        playerOne: players[0]._id.toString(),
                        playerTwo: players[1]._id.toString(),
                        playerThree: players[2]._id.toString(),
                        playerFour: players[3]._id.toString(),
                        playerFive: players[4]._id.toString()
                    },
                    {
                        userId: userOne._id.toString(),
                        roundNumber: 2,
                        setPlays: 'team-one-second-setplay',
                        playerOne: players[0]._id.toString(),
                        playerTwo: players[1]._id.toString(),
                        playerThree: players[2]._id.toString(),
                        playerFour: players[3]._id.toString(),
                        playerFive: players[4]._id.toString()
                    }
                ]);

            await ScoreDetailsModel.create([
                {
                    scheduleId: scheduleOne._id.toString(),
                    roundNumber: 1,
                    teamOne: {
                        userId: userOne._id.toString(),
                        startingLineupId: startingLineupOne._id.toString(),
                        players: [
                            {
                                playerId: players[0]._id.toString(),
                                heatOne: 3,
                                setPlay: 1,
                                comment: 'Solid ride'
                            }
                        ],
                        trainer: {
                            heatOne: 1,
                            setPlay: 0,
                            comment: 'Trainer one'
                        }
                    },
                    teamTwo: {
                        userId: userTwo._id.toString(),
                        startingLineupId: startingLineupTwo._id.toString(),
                        players: [
                            {
                                playerId: players[1]._id.toString(),
                                heatOne: 2,
                                setPlay: 0,
                                comment: 'Strong start'
                            }
                        ],
                        trainer: {
                            heatOne: 0,
                            setPlay: 1,
                            comment: 'Trainer two'
                        }
                    }
                },
                {
                    scheduleId: scheduleTwo._id.toString(),
                    roundNumber: 2,
                    teamOne: {
                        userId: userThree._id.toString(),
                        startingLineupId: startingLineupThree._id.toString()
                    },
                    teamTwo: {
                        userId: userOne._id.toString(),
                        startingLineupId: startingLineupFour._id.toString()
                    }
                }
            ]);

            const historyTeams = await HistoryTeamModel.create([
                createHistoryTeamData(
                    new mongoose.Types.ObjectId().toString(),
                    {
                        name: 'Team Alpha',
                        coachName: 'Coach Alpha'
                    }
                ),
                createHistoryTeamData(
                    new mongoose.Types.ObjectId().toString(),
                    {
                        name: 'Team Beta',
                        coachName: 'Coach Beta'
                    }
                ),
                createHistoryTeamData(
                    new mongoose.Types.ObjectId().toString(),
                    {
                        name: 'Team Gamma',
                        coachName: 'Coach Gamma'
                    }
                )
            ]);

            const seasonId = new mongoose.Types.ObjectId().toString();

            const savedDocumentId =
                await HistoryGamesModel.saveScheduleToHistory(seasonId);

            const savedDocument: HistoryGamesType | null =
                await HistoryGamesModel.findById(savedDocumentId).lean().exec();

            expect(savedDocument).not.toBeNull();
            expect(savedDocument?.season?.toString()).toBe(seasonId);
            expect(savedDocument?.games).toHaveLength(2);

            const firstGame = savedDocument?.games.find(
                game => game.roundNumber === 1
            );
            const secondGame = savedDocument?.games.find(
                game => game.roundNumber === 2
            );

            expect(firstGame?.stage).toBe('regularSeason');
            expect(firstGame?.teamOne.score).toBe(44);
            expect(firstGame?.teamTwo.score).toBe(40);
            expect(firstGame?.teamOne.teamId?.toString()).toBe(
                historyTeams[0]._id.toString()
            );
            expect(firstGame?.teamTwo.teamId?.toString()).toBe(
                historyTeams[1]._id.toString()
            );
            expect(firstGame?.scoreDetails).toBeDefined();

            expect(secondGame?.stage).toBe('regularSeason');
            expect(secondGame?.teamOne.score).toBe(38);
            expect(secondGame?.teamTwo.score).toBe(50);
            expect(secondGame?.teamOne.teamId?.toString()).toBe(
                historyTeams[2]._id.toString()
            );
            expect(secondGame?.teamTwo.teamId?.toString()).toBe(
                historyTeams[0]._id.toString()
            );
            expect(secondGame?.scoreDetails).toBeDefined();

            const firstScoreDetails =
                await HistoryGamesScoreDetailsModel.findById(
                    firstGame?.scoreDetails
                )
                    .lean()
                    .exec();

            expect(firstScoreDetails?.teamOne.setPlays).toEqual([
                'team-one-setplay'
            ]);
            expect(firstScoreDetails?.teamTwo.setPlays).toEqual([
                'team-two-setplay'
            ]);

            expect(firstScoreDetails?.teamOne.score).toBe(44);
            expect(firstScoreDetails?.teamTwo.score).toBe(40);
            expect(firstScoreDetails?.teamOne.teamId?.toString()).toBe(
                historyTeams[0]._id.toString()
            );
            expect(firstScoreDetails?.teamTwo.teamId?.toString()).toBe(
                historyTeams[1]._id.toString()
            );

            expect(firstScoreDetails?.teamOne.trainer?.heatOne).toBe(1);
            expect(firstScoreDetails?.teamOne.trainer?.setPlay).toBe(0);
            expect(firstScoreDetails?.teamOne.trainer?.comment).toBe(
                'Trainer one'
            );
            expect(firstScoreDetails?.teamTwo.trainer?.heatOne).toBe(0);
            expect(firstScoreDetails?.teamTwo.trainer?.setPlay).toBe(1);
            expect(firstScoreDetails?.teamTwo.trainer?.comment).toBe(
                'Trainer two'
            );

            expect(firstScoreDetails?.teamOne.players).toHaveLength(1);
            expect(
                firstScoreDetails?.teamOne.players?.[0].playerId?.toString()
            ).toBe(players[0]._id.toString());
            expect(firstScoreDetails?.teamOne.players?.[0].heatOne).toBe(3);
            expect(firstScoreDetails?.teamOne.players?.[0].comment).toBe(
                'Solid ride'
            );

            expect(firstScoreDetails?.teamTwo.players).toHaveLength(1);
            expect(
                firstScoreDetails?.teamTwo.players?.[0].playerId?.toString()
            ).toBe(players[1]._id.toString());
            expect(firstScoreDetails?.teamTwo.players?.[0].heatOne).toBe(2);
            expect(firstScoreDetails?.teamTwo.players?.[0].comment).toBe(
                'Strong start'
            );
        });
    });

    describe('saveSchedulePlayoffToHistory', () => {
        test('should throw error if await SchedulePlayoffModel.getScheduleForHistory() will not return data', async () => {
            const seasonId = new mongoose.Types.ObjectId().toString();

            await expect(
                HistoryGamesModel.saveSchedulePlayoffToHistory(seasonId)
            ).rejects.toThrow('Schedule not found');
        });

        test('should throw error if await HistoryTeamModel.getHistoryTeamIdByNameAndCoachName will not return data', async () => {
            const [userOne, userTwo] = await UserModel.create([
                createUserData(0),
                createUserData(1)
            ]);

            const schedule = await SchedulePlayoffModel.create({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 1,
                userOneSeed: 1,
                userTwoSeed: 2,
                userOneScore: 44,
                userTwoScore: 40,
                stage: 'final'
            });

            await ScoreDetailsPlayoffModel.create({
                scheduleId: schedule._id.toString(),
                roundNumber: 1,
                teamOne: { userId: userOne._id.toString() },
                teamTwo: { userId: userTwo._id.toString() }
            });

            const seasonId = new mongoose.Types.ObjectId().toString();

            // no matching HistoryTeam document created for this user's teamName/coachName
            await expect(
                HistoryGamesModel.saveSchedulePlayoffToHistory(seasonId)
            ).rejects.toThrow(
                `History team not found for name: ${userOne.teamName} and coachName: ${userOne.coachName}`
            );
        });

        test('should properly create a document with history games data with correct type and values', async () => {
            const [userOne, userTwo, userThree] = await UserModel.create([
                createUserData(0, {
                    teamName: 'Team Alpha',
                    coachName: 'Coach Alpha'
                }),
                createUserData(1, {
                    teamName: 'Team Beta',
                    coachName: 'Coach Beta'
                }),
                createUserData(2, {
                    teamName: 'Team Gamma',
                    coachName: 'Coach Gamma'
                })
            ]);

            const players = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' },
                { extraligaPlayerName: 'Player Two' },
                { extraligaPlayerName: 'Player Three' },
                { extraligaPlayerName: 'Player Four' },
                { extraligaPlayerName: 'Player Five' }
            ]);

            const [scheduleOne, scheduleTwo] =
                await SchedulePlayoffModel.create([
                    {
                        userOneId: userOne._id.toString(),
                        userTwoId: userTwo._id.toString(),
                        roundNumber: 3,
                        userOneSeed: 1,
                        userTwoSeed: 2,
                        userOneScore: 44,
                        userTwoScore: 40,
                        stage: 'final'
                    },
                    {
                        userOneId: userThree._id.toString(),
                        userTwoId: userOne._id.toString(),
                        roundNumber: 4,
                        userOneSeed: 3,
                        userTwoSeed: 1,
                        userOneScore: 30,
                        userTwoScore: 36,
                        stage: '3rdplace'
                    }
                ]);

            const [startingLineupOne, startingLineupTwo] =
                await StartingLineupPlayoffModel.create([
                    {
                        userId: userOne._id.toString(),
                        roundNumber: 3,
                        setPlays: 'team-one-setplay',
                        playerOne: players[0]._id.toString(),
                        playerTwo: players[1]._id.toString(),
                        playerThree: players[2]._id.toString(),
                        playerFour: players[3]._id.toString(),
                        playerFive: players[4]._id.toString()
                    },
                    {
                        userId: userTwo._id.toString(),
                        roundNumber: 3,
                        setPlays: 'team-two-setplay',
                        playerOne: players[0]._id.toString(),
                        playerTwo: players[1]._id.toString(),
                        playerThree: players[2]._id.toString(),
                        playerFour: players[3]._id.toString(),
                        playerFive: players[4]._id.toString()
                    }
                ]);
            const [startingLineupThree, startingLineupFour] =
                await StartingLineupPlayoffModel.create([
                    {
                        userId: userThree._id.toString(),
                        roundNumber: 4,
                        setPlays: 'team-three-setplay',
                        playerOne: players[0]._id.toString(),
                        playerTwo: players[1]._id.toString(),
                        playerThree: players[2]._id.toString(),
                        playerFour: players[3]._id.toString(),
                        playerFive: players[4]._id.toString()
                    },
                    {
                        userId: userOne._id.toString(),
                        roundNumber: 4,
                        setPlays: 'team-one-second-setplay',
                        playerOne: players[0]._id.toString(),
                        playerTwo: players[1]._id.toString(),
                        playerThree: players[2]._id.toString(),
                        playerFour: players[3]._id.toString(),
                        playerFive: players[4]._id.toString()
                    }
                ]);

            await ScoreDetailsPlayoffModel.create([
                {
                    scheduleId: scheduleOne._id.toString(),
                    roundNumber: 3,
                    teamOne: {
                        userId: userOne._id.toString(),
                        startingLineupId: startingLineupOne._id.toString(),
                        players: [
                            {
                                playerId: players[0]._id.toString(),
                                heatOne: 3,
                                setPlay: 1,
                                comment: 'Solid ride'
                            }
                        ],
                        trainer: {
                            heatOne: 1,
                            setPlay: 0,
                            comment: 'Trainer one'
                        }
                    },
                    teamTwo: {
                        userId: userTwo._id.toString(),
                        startingLineupId: startingLineupTwo._id.toString(),
                        players: [
                            {
                                playerId: players[1]._id.toString(),
                                heatOne: 2,
                                setPlay: 0,
                                comment: 'Strong start'
                            }
                        ],
                        trainer: {
                            heatOne: 0,
                            setPlay: 1,
                            comment: 'Trainer two'
                        }
                    }
                },
                {
                    scheduleId: scheduleTwo._id.toString(),
                    roundNumber: 4,
                    teamOne: {
                        userId: userThree._id.toString(),
                        startingLineupId: startingLineupThree._id.toString()
                    },
                    teamTwo: {
                        userId: userOne._id.toString(),
                        startingLineupId: startingLineupFour._id.toString()
                    }
                }
            ]);

            const historyTeams = await HistoryTeamModel.create([
                createHistoryTeamData(
                    new mongoose.Types.ObjectId().toString(),
                    {
                        name: 'Team Alpha',
                        coachName: 'Coach Alpha'
                    }
                ),
                createHistoryTeamData(
                    new mongoose.Types.ObjectId().toString(),
                    {
                        name: 'Team Beta',
                        coachName: 'Coach Beta'
                    }
                ),
                createHistoryTeamData(
                    new mongoose.Types.ObjectId().toString(),
                    {
                        name: 'Team Gamma',
                        coachName: 'Coach Gamma'
                    }
                )
            ]);

            const seasonId = new mongoose.Types.ObjectId().toString();

            const savedDocumentId =
                await HistoryGamesModel.saveSchedulePlayoffToHistory(seasonId);

            const savedDocument: HistoryGamesType | null =
                await HistoryGamesModel.findById(savedDocumentId).lean().exec();

            expect(savedDocument).not.toBeNull();
            expect(savedDocument?.season?.toString()).toBe(seasonId);
            expect(savedDocument?.games).toHaveLength(2);

            const firstGame = savedDocument?.games.find(
                game => game.roundNumber === 3
            );
            const secondGame = savedDocument?.games.find(
                game => game.roundNumber === 4
            );

            expect(firstGame?.stage).toBe('playoff');
            expect(firstGame?.teamOne.score).toBe(44);
            expect(firstGame?.teamTwo.score).toBe(40);
            expect(firstGame?.teamOne.teamId?.toString()).toBe(
                historyTeams[0]._id.toString()
            );
            expect(firstGame?.teamTwo.teamId?.toString()).toBe(
                historyTeams[1]._id.toString()
            );
            expect(firstGame?.scoreDetails).toBeDefined();

            expect(secondGame?.stage).toBe('playoff');
            expect(secondGame?.teamOne.score).toBe(30);
            expect(secondGame?.teamTwo.score).toBe(36);
            expect(secondGame?.teamOne.teamId?.toString()).toBe(
                historyTeams[2]._id.toString()
            );
            expect(secondGame?.teamTwo.teamId?.toString()).toBe(
                historyTeams[0]._id.toString()
            );
            expect(secondGame?.scoreDetails).toBeDefined();

            const firstScoreDetails =
                await HistoryGamesScoreDetailsModel.findById(
                    firstGame?.scoreDetails
                )
                    .lean()
                    .exec();

            expect(firstScoreDetails?.teamOne.setPlays).toEqual([
                'team-one-setplay'
            ]);
            expect(firstScoreDetails?.teamTwo.setPlays).toEqual([
                'team-two-setplay'
            ]);

            expect(firstScoreDetails?.teamOne.score).toBe(44);
            expect(firstScoreDetails?.teamTwo.score).toBe(40);
            expect(firstScoreDetails?.teamOne.teamId?.toString()).toBe(
                historyTeams[0]._id.toString()
            );
            expect(firstScoreDetails?.teamTwo.teamId?.toString()).toBe(
                historyTeams[1]._id.toString()
            );

            expect(firstScoreDetails?.teamOne.trainer?.heatOne).toBe(1);
            expect(firstScoreDetails?.teamOne.trainer?.setPlay).toBe(0);
            expect(firstScoreDetails?.teamOne.trainer?.comment).toBe(
                'Trainer one'
            );
            expect(firstScoreDetails?.teamTwo.trainer?.heatOne).toBe(0);
            expect(firstScoreDetails?.teamTwo.trainer?.setPlay).toBe(1);
            expect(firstScoreDetails?.teamTwo.trainer?.comment).toBe(
                'Trainer two'
            );

            expect(firstScoreDetails?.teamOne.players).toHaveLength(1);
            expect(
                firstScoreDetails?.teamOne.players?.[0].playerId?.toString()
            ).toBe(players[0]._id.toString());
            expect(firstScoreDetails?.teamOne.players?.[0].heatOne).toBe(3);
            expect(firstScoreDetails?.teamOne.players?.[0].comment).toBe(
                'Solid ride'
            );

            expect(firstScoreDetails?.teamTwo.players).toHaveLength(1);
            expect(
                firstScoreDetails?.teamTwo.players?.[0].playerId?.toString()
            ).toBe(players[1]._id.toString());
            expect(firstScoreDetails?.teamTwo.players?.[0].heatOne).toBe(2);
            expect(firstScoreDetails?.teamTwo.players?.[0].comment).toBe(
                'Strong start'
            );
        });
    });
});
