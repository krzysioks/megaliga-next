import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import ScheduleModel from '@/db/models/games/schedule';
import ScoreDetailsModel, {
    PlayerScoreDetailsType,
    ScoreDetailsReturnType,
    ScoreDetailsType
} from '@/db/models/games/score-details';
import StartingLineupModel from '@/db/models/games/starting-lineup';
import PlayersModel from '@/db/models/players';
import UserModel, { UserType } from '@/db/models/user';

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
    await ScoreDetailsModel.deleteMany();
    await ScheduleModel.deleteMany();
    await StartingLineupModel.deleteMany();
    await PlayersModel.deleteMany();
    await UserModel.deleteMany();
});

// close connection to server so that test suite will close
afterAll(async () => {
    await ScoreDetailsModel.deleteMany();
    await ScheduleModel.deleteMany();
    await StartingLineupModel.deleteMany();
    await PlayersModel.deleteMany();
    await UserModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test ScoreDetailsModel methods and static functions', () => {
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
            setPlays: 'team-one-setplay',
            playerOne: players[0]._id.toString(),
            playerTwo: players[1]._id.toString(),
            playerThree: players[2]._id.toString(),
            playerFour: players[3]._id.toString(),
            playerFive: players[4]._id.toString()
        }).save();

        const startingLineupTwo = await new StartingLineupModel({
            userId: userTwo._id.toString(),
            roundNumber: 3,
            setPlays: 'team-two-setplay',
            playerOne: players[5]._id.toString(),
            playerTwo: players[6]._id.toString(),
            playerThree: players[7]._id.toString(),
            playerFour: players[8]._id.toString(),
            playerFive: players[9]._id.toString()
        }).save();

        const schedule = await new ScheduleModel({
            userOneId: userOne._id.toString(),
            userTwoId: userTwo._id.toString(),
            roundNumber: 3,
            ligueGroupsId: new mongoose.Types.ObjectId().toString(),
            userOneScore: 46,
            userTwoScore: 44
        }).save();

        const scoreDetailsToCreate: ScoreDetailsType = {
            scheduleId: schedule._id.toString(),
            roundNumber: 3,
            teamOne: {
                userId: userOne._id.toString(),
                players: [
                    {
                        playerId: players[0]._id.toString(),
                        heatOne: 3,
                        heatTwo: 2,
                        setPlay: 1,
                        comment: 'Solid ride'
                    },
                    {
                        playerId: players[1]._id.toString(),
                        heatOne: 1,
                        heatTwo: 3,
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
                        heatOne: 2,
                        heatTwo: 3,
                        setPlay: 1,
                        comment: 'Strong start'
                    },
                    {
                        playerId: players[3]._id.toString(),
                        heatOne: 0,
                        heatTwo: 1,
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

        expect(result.teamOne.setPlays).toBe(startingLineupOne.setPlays);
        expect(result.teamTwo.setPlays).toBe(startingLineupTwo.setPlays);

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

        expect(result.teamOne.players[0].heatOne).toBe(3);
        expect(result.teamOne.players[0].comment).toBe('Solid ride');
        expect(result.teamTwo.players[0].heatTwo).toBe(3);

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

    describe('getScoreDetailsForHistory', () => {
        test('Should return all score details documents with players, trainer and setPlays populated for both teams', async () => {
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
                setPlays: 'team-one-setplay',
                playerOne: players[0]._id.toString(),
                playerTwo: players[1]._id.toString(),
                playerThree: players[2]._id.toString(),
                playerFour: players[3]._id.toString(),
                playerFive: players[4]._id.toString()
            }).save();

            const startingLineupTwo = await new StartingLineupModel({
                userId: userTwo._id.toString(),
                roundNumber: 3,
                setPlays: 'team-two-setplay',
                playerOne: players[5]._id.toString(),
                playerTwo: players[6]._id.toString(),
                playerThree: players[7]._id.toString(),
                playerFour: players[8]._id.toString(),
                playerFive: players[9]._id.toString()
            }).save();

            const schedule = await new ScheduleModel({
                userOneId: userOne._id.toString(),
                userTwoId: userTwo._id.toString(),
                roundNumber: 3,
                ligueGroupsId: new mongoose.Types.ObjectId().toString(),
                userOneScore: 46,
                userTwoScore: 44
            }).save();

            const scoreDetailsToCreate: ScoreDetailsType = {
                scheduleId: schedule._id.toString(),
                roundNumber: 3,
                teamOne: {
                    userId: userOne._id.toString(),
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
                    },
                    startingLineupId: startingLineupOne._id.toString()
                },
                teamTwo: {
                    userId: userTwo._id.toString(),
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
                    },
                    startingLineupId: startingLineupTwo._id.toString()
                }
            };

            await new ScoreDetailsModel(scoreDetailsToCreate).save();

            const result = await ScoreDetailsModel.getScoreDetailsForHistory();

            expect(result).toHaveLength(1);

            const [scoreDetails] = result;

            expect(scoreDetails.teamOne.setPlays).toBe(
                startingLineupOne.setPlays
            );
            expect(scoreDetails.teamTwo.setPlays).toBe(
                startingLineupTwo.setPlays
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

        test('Should throw error when there is no score details data', async () => {
            await expect(
                ScoreDetailsModel.getScoreDetailsForHistory()
            ).rejects.toThrow('Score details not found');
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
                            heatOne: 3,
                            heatTwo: 2,
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
                            heatOne: 1,
                            heatTwo: 1,
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

            const playerScoreDetails: PlayerScoreDetailsType =
                result.playerScoreDetails;

            expect(playerScoreDetails.heatOne).toBe(3);
            expect(playerScoreDetails.heatTwo).toBe(2);
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

            const playerScoreDetails: PlayerScoreDetailsType =
                result.playerScoreDetails;

            expect(playerScoreDetails.heatOne).toBeUndefined();
            expect(playerScoreDetails.heatTwo).toBeUndefined();
            expect(playerScoreDetails.heatThree).toBeUndefined();
            expect(playerScoreDetails.heatFour).toBeUndefined();
            expect(playerScoreDetails.heatFive).toBeUndefined();
            expect(playerScoreDetails.heatSix).toBeUndefined();
            expect(playerScoreDetails.heatSeven).toBeUndefined();
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
                    heatOne: 3
                })
            ).rejects.toThrow(
                `Schedule not found for userId: ${userOne._id.toString()} and roundNumber: 7`
            );
        });

        test('Should fill in all missing heats with 0', async () => {
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
                heatFour: 2
            });

            const savedDocument = await ScoreDetailsModel.findOne({
                roundNumber: 12
            }).exec();
            const savedPlayer = savedDocument?.teamOne.players?.[0];

            expect(savedPlayer?.heatOne).toBe(0);
            expect(savedPlayer?.heatTwo).toBe(0);
            expect(savedPlayer?.heatThree).toBe(0);
            expect(savedPlayer?.heatFour).toBe(2);
            expect(savedPlayer?.heatFive).toBe(0);
            expect(savedPlayer?.heatSix).toBe(0);
            expect(savedPlayer?.heatSeven).toBe(0);
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
                { heatOne: 3, heatTwo: 2 }
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
            expect(savedDocument?.teamOne.players?.[0]?.heatOne).toBe(3);
            expect(savedDocument?.teamOne.players?.[0]?.heatTwo).toBe(2);
            expect(savedDocument?.teamOne.players?.[0]?.heatThree).toBe(0);
            expect(savedDocument?.teamOne.players?.[0]?.heatSeven).toBe(0);
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
                heatThree: 1
            });

            const savedDocument = await ScoreDetailsModel.findOne({
                roundNumber: 9
            }).exec();

            expect(savedDocument?.teamTwo.userId?.toString()).toBe(
                userTwo._id.toString()
            );
            expect(savedDocument?.teamTwo.players?.[0]?.heatThree).toBe(1);
            expect(savedDocument?.teamTwo.players?.[0]?.heatOne).toBe(0);
            expect(savedDocument?.teamTwo.players?.[0]?.heatTwo).toBe(0);
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
                heatOne: 1
            });
            await ScoreDetailsModel.savePlayerScoreDetails(playerData, 10, {
                heatOne: 4,
                heatTwo: 3
            });

            const savedDocument = await ScoreDetailsModel.findOne({
                roundNumber: 10
            }).exec();

            expect(savedDocument?.teamOne.players).toHaveLength(1);
            expect(savedDocument?.teamOne.players?.[0]?.heatOne).toBe(4);
            expect(savedDocument?.teamOne.players?.[0]?.heatTwo).toBe(3);
            expect(savedDocument?.teamOne.players?.[0]?.heatThree).toBe(0);
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
                { heatOne: 5 }
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

            expect(documentForUserOne?.teamOne.players?.[0]?.heatOne).toBe(5);
            expect(documentForUserFour?.teamTwo.players?.[0]?.heatOne).toBe(5);
            expect(documentForUserOne?.teamOne.players?.[0]?.heatTwo).toBe(0);
            expect(documentForUserFour?.teamTwo.players?.[0]?.heatTwo).toBe(0);
        });
    });
});
