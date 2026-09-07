import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import SchedulePlayoffModel from '@/db/models/games/schedule-playoff';
import ScoreDetailsPlayoffModel, {
    ScoreDetailsPlayoffDtoType,
    ScoreDetailsPlayoffType
} from '@/db/models/games/score-details-playoff';
import StartingLineupPlayoffModel from '@/db/models/games/starting-lineup-playoff';
import PlayersModel from '@/db/models/players';
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

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

beforeEach(async () => {
    await ScoreDetailsPlayoffModel.deleteMany();
    await SchedulePlayoffModel.deleteMany();
    await StartingLineupPlayoffModel.deleteMany();
    await PlayersModel.deleteMany();
    await UserModel.deleteMany();
});

afterAll(async () => {
    await ScoreDetailsPlayoffModel.deleteMany();
    await SchedulePlayoffModel.deleteMany();
    await StartingLineupPlayoffModel.deleteMany();
    await PlayersModel.deleteMany();
    await UserModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test ScoreDetailsPlayoffModel methods and static functions', () => {
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
            setPlays: 'playoff-team-one-setplay',
            playerOne: players[0]._id.toString(),
            playerTwo: players[1]._id.toString(),
            playerThree: players[2]._id.toString(),
            playerFour: players[3]._id.toString(),
            playerFive: players[4]._id.toString()
        }).save();

        const startingLineupTwo = await new StartingLineupPlayoffModel({
            userId: userTwo._id.toString(),
            roundNumber: 1,
            setPlays: 'playoff-team-two-setplay',
            playerOne: players[5]._id.toString(),
            playerTwo: players[6]._id.toString(),
            playerThree: players[7]._id.toString(),
            playerFour: players[8]._id.toString(),
            playerFive: players[9]._id.toString()
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

        const scoreDetailsToCreate: ScoreDetailsPlayoffType = {
            scheduleId: schedule._id.toString(),
            roundNumber: 1,
            teamOne: {
                userId: userOne._id.toString(),
                players: [
                    {
                        playerId: players[0]._id.toString(),
                        heatOne: 3,
                        heatTwo: 2,
                        setPlay: 1,
                        comment: 'Playoff solid ride'
                    },
                    {
                        playerId: players[1]._id.toString(),
                        heatOne: 1,
                        heatTwo: 3,
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
                        heatOne: 2,
                        heatTwo: 3,
                        setPlay: 1,
                        comment: 'Playoff strong start'
                    },
                    {
                        playerId: players[3]._id.toString(),
                        heatOne: 0,
                        heatTwo: 1,
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

        const result: ScoreDetailsPlayoffDtoType =
            await ScoreDetailsPlayoffModel.getScoreDetailsByScheduleAndRoundId(
                schedule._id.toString(),
                1
            );

        expect(result.roundNumber).toBe(1);
        expect(result.userOneScore).toBe(50);
        expect(result.userTwoScore).toBe(40);

        expect(result.teamOne.teamName).toBe(userOne.teamName);
        expect(result.teamTwo.teamName).toBe(userTwo.teamName);

        expect(result.teamOne.setPlays).toBe(startingLineupOne.setPlays);
        expect(result.teamTwo.setPlays).toBe(startingLineupTwo.setPlays);

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

        expect(result.teamOne.players[0].heatOne).toBe(3);
        expect(result.teamOne.players[0].comment).toBe('Playoff solid ride');
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

    describe('getScoreDetailsForHistory', () => {
        test('Should return all playoff score details documents with players, trainer and setPlays populated for both teams', async () => {
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
                setPlays: 'playoff-team-one-setplay',
                playerOne: players[0]._id.toString(),
                playerTwo: players[1]._id.toString(),
                playerThree: players[2]._id.toString(),
                playerFour: players[3]._id.toString(),
                playerFive: players[4]._id.toString()
            }).save();

            const startingLineupTwo = await new StartingLineupPlayoffModel({
                userId: userTwo._id.toString(),
                roundNumber: 1,
                setPlays: 'playoff-team-two-setplay',
                playerOne: players[5]._id.toString(),
                playerTwo: players[6]._id.toString(),
                playerThree: players[7]._id.toString(),
                playerFour: players[8]._id.toString(),
                playerFive: players[9]._id.toString()
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

            const scoreDetailsToCreate: ScoreDetailsPlayoffType = {
                scheduleId: schedule._id.toString(),
                roundNumber: 1,
                teamOne: {
                    userId: userOne._id.toString(),
                    players: [
                        {
                            playerId: players[0]._id.toString(),
                            heatOne: 3,
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
                            heatOne: 2,
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
                startingLineupOne.setPlays
            );
            expect(scoreDetails.teamTwo.setPlays).toBe(
                startingLineupTwo.setPlays
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

        test('Should throw error when there is no playoff score details data', async () => {
            await expect(
                ScoreDetailsPlayoffModel.getScoreDetailsForHistory()
            ).rejects.toThrow('Score details not found');
        });
    });
});
