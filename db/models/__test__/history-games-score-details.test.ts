import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import HistoryGamesScoreDetailsModel, {
    HistoryGamesScoreDetailsByIdReturnType,
    HistoryGamesScoreDetailsType
} from '@/db/models/history/history-games-score-details';
import HistoryTeamModel, {
    HistoryTeamType
} from '@/db/models/history/history-team';
import PlayersModel from '@/db/models/players';

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

beforeEach(async () => {
    await HistoryGamesScoreDetailsModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await PlayersModel.deleteMany();
});

afterAll(async () => {
    await HistoryGamesScoreDetailsModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await PlayersModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test HistoryGamesScoreDetailsModel methods and static functions', () => {
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

    test('should throw error if provided id is not valid', async () => {
        const invalidId = new mongoose.Types.ObjectId().toString();

        await expect(
            HistoryGamesScoreDetailsModel.getHistoryScoreDetailsById(invalidId)
        ).rejects.toThrow(`Invalid id: ${invalidId}`);
    });

    test('should return properly populated history score details data for existing id', async () => {
        const teamOne = await HistoryTeamModel.create(
            createHistoryTeamData(new mongoose.Types.ObjectId().toString(), {
                name: 'Team A',
                logoUrl: 'https://example.com/team-a.png'
            })
        );
        const teamTwo = await HistoryTeamModel.create(
            createHistoryTeamData(new mongoose.Types.ObjectId().toString(), {
                name: 'Team B',
                logoUrl: 'https://example.com/team-b.png'
            })
        );

        const players = await PlayersModel.create([
            { extraligaPlayerName: 'Player One' },
            { extraligaPlayerName: 'Player Two' },
            { extraligaPlayerName: 'Player Three' },
            { extraligaPlayerName: 'Player Four' }
        ]);

        const scoreDetailsToCreate: HistoryGamesScoreDetailsType = {
            teamOne: {
                teamId: teamOne._id.toString(),
                score: 46,
                setPlays: ['team-one-setplay'],
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
                }
            },
            teamTwo: {
                teamId: teamTwo._id.toString(),
                score: 44,
                setPlays: ['team-two-setplay'],
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
                }
            }
        };

        const createdDocument =
            await HistoryGamesScoreDetailsModel.create(scoreDetailsToCreate);

        const result: HistoryGamesScoreDetailsByIdReturnType =
            await HistoryGamesScoreDetailsModel.getHistoryScoreDetailsById(
                createdDocument._id.toString()
            );

        expect(result.teamOne.teamName).toBe('Team A');
        expect(result.teamTwo.teamName).toBe('Team B');
        expect(result.teamOne.score).toBe(46);
        expect(result.teamTwo.score).toBe(44);

        expect(result.teamOne.setPlays).toEqual(['team-one-setplay']);
        expect(result.teamTwo.setPlays).toEqual(['team-two-setplay']);

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
            (result.teamOne as Record<string, unknown>).teamId
        ).toBeUndefined();
    });

    describe('saveScoreDetailToHistory', () => {
        test('should create a document and return its id', async () => {
            const teamOne = await HistoryTeamModel.create(
                createHistoryTeamData(
                    new mongoose.Types.ObjectId().toString(),
                    {
                        name: 'Team A'
                    }
                )
            );
            const teamTwo = await HistoryTeamModel.create(
                createHistoryTeamData(
                    new mongoose.Types.ObjectId().toString(),
                    {
                        name: 'Team B'
                    }
                )
            );

            const players = await PlayersModel.create([
                { extraligaPlayerName: 'Player One' },
                { extraligaPlayerName: 'Player Two' }
            ]);

            const scoreDetail: HistoryGamesScoreDetailsType = {
                teamOne: {
                    teamId: teamOne._id.toString(),
                    score: 46,
                    setPlays: ['team-one-setplay'],
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
                    teamId: teamTwo._id.toString(),
                    score: 44,
                    setPlays: ['team-two-setplay'],
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
            };

            const savedId =
                await HistoryGamesScoreDetailsModel.saveScoreDetailToHistory(
                    scoreDetail
                );

            const savedDocument = await HistoryGamesScoreDetailsModel.findById(
                savedId
            )
                .lean()
                .exec();

            expect(savedDocument?.teamOne.teamId?.toString()).toBe(
                teamOne._id.toString()
            );
            expect(savedDocument?.teamTwo.teamId?.toString()).toBe(
                teamTwo._id.toString()
            );
            expect(savedDocument?.teamOne.score).toBe(46);
            expect(savedDocument?.teamTwo.score).toBe(44);
        });
    });
});
