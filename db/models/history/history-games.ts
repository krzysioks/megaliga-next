import { HydratedDocument, model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import ScheduleModel from '@/db/models/games/schedule';
import SchedulePlayoffModel from '@/db/models/games/schedule-playoff';
import ScoreDetailsModel from '@/db/models/games/score-details';
import ScoreDetailsPlayoffModel from '@/db/models/games/score-details-playoff';
import HistoryGamesScoreDetailsModel, {
    HistoryGamesScoreDetailsType
} from '@/db/models/history/history-games-score-details';
import HistoryTeamModel, {
    HistoryTeamType
} from '@/db/models/history/history-team';
import {
    roundNumberSchema,
    objectIdSchema,
    stageEnumSchema
} from '@/db/models/schema.types';
import SeasonOpsModel from '@/db/models/season-ops';

//HistoryGames collection represent in each document all games played in given season of megaliga
// We will identify all games for given team in given season by finding all documents by season, teamId and stage in historyGames collection

const STAGE_ENUM = stageEnumSchema._def.values;

export const historyGamesZodSchema = z.object({
    season: objectIdSchema, // Reference to SeasonOps collection
    games: z.array(
        z.object({
            teamOne: z.object({
                teamId: objectIdSchema, // Reference to team in HistoryTeam collection
                score: z.number().min(0)
            }),
            teamTwo: z.object({
                teamId: objectIdSchema, // Reference to team in HistoryTeam collection
                score: z.number().min(0)
            }),
            roundNumber: roundNumberSchema,
            stage: stageEnumSchema,
            scoreDetails: objectIdSchema.optional() // Reference to HistoryGamesScoreDetails document
        })
    )
});

export type HistoryGamesType = z.infer<typeof historyGamesZodSchema>;

interface TeamReturnType {
    teamName: HistoryTeamType['name'];
    logoUrl: HistoryTeamType['logoUrl'];
    score: HistoryGamesType['games'][number]['teamOne']['score'];
}

export type UserSeasonGamesByStageReturnType = {
    teamOne: TeamReturnType;
    teamTwo: TeamReturnType;
    roundNumber: HistoryGamesType['games'][number]['roundNumber'];
    scoreDetails: HistoryGamesType['games'][number]['scoreDetails'];
};

type PopulatedHistoryGamesType = Omit<HistoryGamesType, 'games'> & {
    games: (Omit<HistoryGamesType['games'][number], 'teamOne' | 'teamTwo'> & {
        teamOne: Omit<
            HistoryGamesType['games'][number]['teamOne'],
            'teamId'
        > & {
            teamId: Pick<HistoryTeamType, 'name' | 'logoUrl'>;
        };
        teamTwo: Omit<
            HistoryGamesType['games'][number]['teamTwo'],
            'teamId'
        > & {
            teamId: Pick<HistoryTeamType, 'name' | 'logoUrl'>;
        };
    })[];
};

export type PopulatedFindType = HydratedDocument<PopulatedHistoryGamesType>;

interface HistoryGamesModelType extends Model<HistoryGamesType> {
    getUserSeasonGamesByStage: (
        seasonId: string,
        userId: string,
        stage: (typeof STAGE_ENUM)[number]
    ) => Promise<UserSeasonGamesByStageReturnType[]>;
    saveScheduleToHistory: (seasonId: string) => Promise<string>;
    saveSchedulePlayoffToHistory: (seasonId: string) => Promise<string>;
}

const historyGamesSchema = new Schema<HistoryGamesType, HistoryGamesModelType>({
    season: {
        type: Schema.Types.ObjectId,
        ref: 'SeasonOps',
        required: true
    },
    games: [
        {
            teamOne: {
                teamId: {
                    type: Schema.Types.ObjectId,
                    ref: 'HistoryTeam',
                    required: true
                },
                score: { type: Number, required: true }
            },
            teamTwo: {
                teamId: {
                    type: Schema.Types.ObjectId,
                    ref: 'HistoryTeam',
                    required: true
                },
                score: { type: Number, required: true }
            },
            roundNumber: { type: Number, required: true },
            stage: {
                type: String,
                enum: STAGE_ENUM,
                required: true
            },
            scoreDetails: {
                type: Schema.Types.ObjectId,
                ref: 'HistoryGamesScoreDetails'
            }
        }
    ]
});

historyGamesSchema.static(
    'getUserSeasonGamesByStage',
    async function getUserSeasonGamesByStage(
        seasonId: string,
        userId: string,
        stage: (typeof STAGE_ENUM)[number]
    ) {
        try {
            const isValidSeasonId = await SeasonOpsModel.exists({
                _id: seasonId
            });
            if (!isValidSeasonId) {
                throw new Error(`Invalid seasonId: ${seasonId}`);
            }

            const isValidUserId = await HistoryTeamModel.exists({
                _id: userId
            });
            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }

            const documents = (await this.findOne({
                season: seasonId,
                'games.stage': stage,
                $or: [
                    { 'games.teamOne.teamId': userId },
                    { 'games.teamTwo.teamId': userId }
                ]
            })
                .populate({
                    path: 'games.teamOne.teamId',
                    select: 'name logoUrl'
                })
                .populate({
                    path: 'games.teamTwo.teamId',
                    select: 'name logoUrl'
                })
                .exec()) as PopulatedHistoryGamesType | null;

            if (!documents || !documents.games.length) {
                throw new Error(
                    `No games found for seasonId: ${seasonId}, userId: ${userId}, stage: ${stage}`
                );
            }

            return documents.games.map(game => {
                return {
                    teamOne: {
                        teamName: game.teamOne.teamId.name,
                        logoUrl: game.teamOne.teamId.logoUrl,
                        score: game.teamOne.score
                    },
                    teamTwo: {
                        teamName: game.teamTwo.teamId.name,
                        logoUrl: game.teamTwo.teamId.logoUrl,
                        score: game.teamTwo.score
                    },
                    roundNumber: game.roundNumber,
                    scoreDetails: game?.scoreDetails?.toString() // Convert ObjectId to string
                };
            });
        } catch (error) {
            console.error(
                `Error fetching user season games by stage for seasonId: ${seasonId}, userId: ${userId}, stage: ${stage}`,
                error
            );
            throw error;
        }
    }
);

historyGamesSchema.static(
    'saveScheduleToHistory',
    async function saveScheduleToHistory(seasonId: string) {
        try {
            const scheduleData = await ScheduleModel.getScheduleForHistory();
            const scoreDetailsData =
                await ScoreDetailsModel.getScoreDetailsForHistory();

            let games: HistoryGamesType['games'] = [];
            for (const schedule of scheduleData) {
                const teamOneId =
                    await HistoryTeamModel.getHistoryTeamIdByNameAndCoachName(
                        schedule.userOne.teamName,
                        schedule.userOne.coachName
                    );
                const teamTwoId =
                    await HistoryTeamModel.getHistoryTeamIdByNameAndCoachName(
                        schedule.userTwo.teamName,
                        schedule.userTwo.coachName
                    );

                const matchingScoreDetails = scoreDetailsData.find(
                    scoreDetails => {
                        return (
                            scoreDetails.scheduleId?.toString() ===
                            schedule.id.toString()
                        );
                    }
                );

                let scoreDetailsId: string | undefined;
                if (matchingScoreDetails) {
                    const scoreDetail: HistoryGamesScoreDetailsType = {
                        teamOne: {
                            players: matchingScoreDetails.teamOne.players,
                            trainer: matchingScoreDetails.teamOne.trainer,
                            setPlays: matchingScoreDetails.teamOne.setPlays
                                ? [matchingScoreDetails.teamOne.setPlays]
                                : undefined,
                            teamId: teamOneId,
                            score: schedule.userOneScore ?? 0
                        },
                        teamTwo: {
                            players: matchingScoreDetails.teamTwo.players,
                            trainer: matchingScoreDetails.teamTwo.trainer,
                            setPlays: matchingScoreDetails.teamTwo.setPlays
                                ? [matchingScoreDetails.teamTwo.setPlays]
                                : undefined,
                            teamId: teamTwoId,
                            score: schedule.userTwoScore ?? 0
                        }
                    };

                    scoreDetailsId =
                        await HistoryGamesScoreDetailsModel.saveScoreDetailToHistory(
                            scoreDetail
                        );
                }

                games = [
                    ...games,
                    {
                        teamOne: {
                            teamId: teamOneId,
                            score: schedule.userOneScore ?? 0
                        },
                        teamTwo: {
                            teamId: teamTwoId,
                            score: schedule.userTwoScore ?? 0
                        },
                        roundNumber: schedule.roundNumber,
                        stage: 'regularSeason',
                        scoreDetails: scoreDetailsId
                    }
                ];
            }

            const newHistoryGamesDocument = await this.create({
                season: seasonId,
                games
            });

            return newHistoryGamesDocument._id.toString();
        } catch (error) {
            console.error('Error saving schedule to history:', error);
            throw error;
        }
    }
);

historyGamesSchema.static(
    'saveSchedulePlayoffToHistory',
    async function saveSchedulePlayoffToHistory(seasonId: string) {
        try {
            const scheduleData =
                await SchedulePlayoffModel.getScheduleForHistory();
            const scoreDetailsData =
                await ScoreDetailsPlayoffModel.getScoreDetailsForHistory();

            let games: HistoryGamesType['games'] = [];
            for (const schedule of scheduleData) {
                const teamOneId =
                    await HistoryTeamModel.getHistoryTeamIdByNameAndCoachName(
                        schedule.userOne.teamName,
                        schedule.userOne.coachName
                    );
                const teamTwoId =
                    await HistoryTeamModel.getHistoryTeamIdByNameAndCoachName(
                        schedule.userTwo.teamName,
                        schedule.userTwo.coachName
                    );

                const matchingScoreDetails = scoreDetailsData.find(
                    scoreDetails => {
                        return (
                            scoreDetails.scheduleId?.toString() ===
                            schedule.id.toString()
                        );
                    }
                );

                let scoreDetailsId: string | undefined;
                if (matchingScoreDetails) {
                    const scoreDetail: HistoryGamesScoreDetailsType = {
                        teamOne: {
                            players: matchingScoreDetails.teamOne.players,
                            trainer: matchingScoreDetails.teamOne.trainer,
                            setPlays: matchingScoreDetails.teamOne.setPlays
                                ? [matchingScoreDetails.teamOne.setPlays]
                                : undefined,
                            teamId: teamOneId,
                            score: schedule.userOneScore ?? 0
                        },
                        teamTwo: {
                            players: matchingScoreDetails.teamTwo.players,
                            trainer: matchingScoreDetails.teamTwo.trainer,
                            setPlays: matchingScoreDetails.teamTwo.setPlays
                                ? [matchingScoreDetails.teamTwo.setPlays]
                                : undefined,
                            teamId: teamTwoId,
                            score: schedule.userTwoScore ?? 0
                        }
                    };

                    scoreDetailsId =
                        await HistoryGamesScoreDetailsModel.saveScoreDetailToHistory(
                            scoreDetail
                        );
                }

                games = [
                    ...games,
                    {
                        teamOne: {
                            teamId: teamOneId,
                            score: schedule.userOneScore ?? 0
                        },
                        teamTwo: {
                            teamId: teamTwoId,
                            score: schedule.userTwoScore ?? 0
                        },
                        roundNumber: schedule.roundNumber,
                        stage: 'playoff',
                        scoreDetails: scoreDetailsId
                    }
                ];
            }

            const newHistoryGamesDocument = await this.create({
                season: seasonId,
                games
            });

            return newHistoryGamesDocument._id.toString();
        } catch (error) {
            console.error('Error saving schedule playoff to history:', error);
            throw error;
        }
    }
);

const HistoryGamesModel = model<HistoryGamesType, HistoryGamesModelType>(
    'HistoryGames',
    historyGamesSchema
);

export default HistoryGamesModel;
