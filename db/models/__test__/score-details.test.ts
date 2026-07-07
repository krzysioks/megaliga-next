import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import ScheduleModel from '@/db/models/games/schedule';
import ScoreDetailsModel, {
    ScoreDetailsDtoType,
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
            { extraligaPlayerName: 'Player Four' }
        ]);

        const startingLineupOne = await new StartingLineupModel({
            userId: userOne._id.toString(),
            roundNumber: 3,
            setPlays: 'team-one-setplay',
            playerOne: players[0]._id.toString(),
            playerTwo: players[1]._id.toString(),
            playerThree: players[0]._id.toString(),
            playerFour: players[1]._id.toString(),
            playerFive: players[0]._id.toString()
        }).save();

        const startingLineupTwo = await new StartingLineupModel({
            userId: userTwo._id.toString(),
            roundNumber: 3,
            setPlays: 'team-two-setplay',
            playerOne: players[2]._id.toString(),
            playerTwo: players[3]._id.toString(),
            playerThree: players[2]._id.toString(),
            playerFour: players[3]._id.toString(),
            playerFive: players[2]._id.toString()
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

        const result: ScoreDetailsDtoType =
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
});
