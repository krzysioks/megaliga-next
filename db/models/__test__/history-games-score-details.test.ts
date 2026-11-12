import type { TeamCalculationDetailsType } from '@/db/models/schema.types';

import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import { STARTING_LINEUP_PLAYER_COUNT } from '@/db/db.constants';
import HistoryGamesScoreDetailsModel, {
    HistoryGamesScoreDetailsByIdReturnType,
    HistoryGamesScoreDetailsInputType,
    historyGamesScoreDetailsZodSchema
} from '@/db/models/history/history-games-score-details';
import HistoryTeamModel, {
    HistoryTeamType
} from '@/db/models/history/history-team';
import PlayersModel from '@/db/models/players';
import { SetPlayEnumType } from '@/db/models/schema.types';

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

        const scoreDetailsToCreate: HistoryGamesScoreDetailsInputType = {
            teamOne: {
                teamId: teamOne._id.toString(),
                score: 46,
                setPlays: 'team-one-setplay',
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
                setPlays: 'team-two-setplay',
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

        expect(result.teamOne.setPlays).toBe('team-one-setplay');
        expect(result.teamTwo.setPlays).toBe('team-two-setplay');

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
        expect(result.teamOne.players[0].heatThree).toBeNull();
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
        test('Should preserve both teams calculation details and user identities without adding result IDs', async () => {
            const playerIds = Array.from(
                { length: STARTING_LINEUP_PLAYER_COUNT + 1 },
                () => {
                    return new mongoose.Types.ObjectId().toString();
                }
            );
            const userId = new mongoose.Types.ObjectId().toString();
            const setPlayId = new mongoose.Types.ObjectId().toString();
            const calculationDetails: TeamCalculationDetailsType = {
                players: playerIds
                    .slice(0, STARTING_LINEUP_PLAYER_COUNT)
                    .map((playerId, index) => {
                        return {
                            playerId,
                            nominalPlayerId:
                                index === 0
                                    ? playerIds[STARTING_LINEUP_PLAYER_COUNT]
                                    : playerId,
                            actualStartCount: 0,
                            basePoints: 0,
                            functionPoints: 0,
                            rolePoints: 0,
                            setPlayPoints: index === 0 ? -4 : 0,
                            function: null,
                            role: null
                        };
                    }),
                trainer: { heatPoints: 0, setPlayPoints: 0 },
                setPlayResults: [0, 1].map(() => {
                    return {
                        selectedSetPlayId:
                            new mongoose.Types.ObjectId().toString(),
                        setPlayId,
                        name: 'NCD6',
                        type: SetPlayEnumType.Ncd6,
                        recipients: [
                            {
                                recipientType: 'player',
                                playerId: playerIds[0],
                                nominalPlayerId:
                                    playerIds[STARTING_LINEUP_PLAYER_COUNT],
                                calculatedPoints: -2,
                                creditedPoints: -2,
                                setPlayContributionType: 'award'
                            }
                        ]
                    };
                }),
                floorAdjustment: 4
            };
            const team = {
                teamId: new mongoose.Types.ObjectId().toString(),
                userId,
                score: 0,
                calculationDetails
            };
            const savedId =
                await HistoryGamesScoreDetailsModel.saveScoreDetailToHistory(
                    historyGamesScoreDetailsZodSchema.parse({
                        teamOne: team,
                        teamTwo: team
                    })
                );
            const savedDocument =
                await HistoryGamesScoreDetailsModel.findById(savedId).exec();
            const savedTeams = savedDocument?.toJSON({
                flattenObjectIds: true
            });

            expect(savedTeams?.teamOne).toMatchObject({ userId });
            expect(savedTeams?.teamTwo).toMatchObject({ userId });
            expect(savedTeams?.teamOne).toHaveProperty(
                'calculationDetails',
                calculationDetails
            );
            expect(savedTeams?.teamTwo).toHaveProperty(
                'calculationDetails',
                calculationDetails
            );
        });

        test('Should save history score details without calculation details or user IDs and return its ID', async () => {
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

            const scoreDetail: HistoryGamesScoreDetailsInputType = {
                teamOne: {
                    teamId: teamOne._id.toString(),
                    score: 46,
                    setPlays: 'team-one-setplay',
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
                    setPlays: 'team-two-setplay',
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
            expect(savedDocument?.teamOne.calculationDetails).toBeUndefined();
            expect(savedDocument?.teamTwo.calculationDetails).toBeUndefined();
            expect(savedDocument?.teamOne.userId).toBeUndefined();
            expect(savedDocument?.teamTwo.userId).toBeUndefined();
        });
    });
});
