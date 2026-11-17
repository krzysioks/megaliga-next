import type {
    GetMatchDataStatisticsParamsType,
    MatchDataStatisticsType
} from '@/db/statistics.types';

import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
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
    stageEnumSchema,
    teamCalculationDetailsZodSchema
} from '@/db/models/schema.types';
import SeasonOpsModel from '@/db/models/season-ops';
import { validateRoundRangeAndStageStatistics } from '@/db/statistics.utils';

//HistoryGames collection represent in each document all games played in given season of megaliga
// We will identify all games for given team in given season by finding all documents by season, teamId and stage in historyGames collection

const STAGE_ENUM = stageEnumSchema.options;

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

type PopulatedHistoryGamesStatisticsScoreDetailsType = Pick<
    HistoryGamesScoreDetailsType,
    'teamOne' | 'teamTwo'
> & { _id: Types.ObjectId };
type PopulatedHistoryGamesStatisticsTeamType = Omit<
    HistoryGamesType['games'][number]['teamOne'],
    'teamId'
> & {
    teamId: Pick<HistoryTeamType, 'name' | 'coachName'> | null;
};
type PopulatedHistoryGamesStatisticsGameType = Omit<
    HistoryGamesType['games'][number],
    'teamOne' | 'teamTwo' | 'scoreDetails'
> & {
    teamOne: PopulatedHistoryGamesStatisticsTeamType;
    teamTwo: PopulatedHistoryGamesStatisticsTeamType;
    scoreDetails: PopulatedHistoryGamesStatisticsScoreDetailsType | null;
};
type PopulatedHistoryGamesStatisticsType = Omit<HistoryGamesType, 'games'> & {
    games: PopulatedHistoryGamesStatisticsGameType[];
};
type PopulatedHistoryGamesStatisticsFindType =
    HydratedDocument<PopulatedHistoryGamesStatisticsType>;

export type PopulatedFindType = HydratedDocument<PopulatedHistoryGamesType>;

interface HistoryGamesModelType extends Model<HistoryGamesType> {
    getMatchDataStatistics: (
        params: GetMatchDataStatisticsParamsType
    ) => Promise<MatchDataStatisticsType[]>;
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
    'getMatchDataStatistics',
    async function getMatchDataStatistics(
        params: GetMatchDataStatisticsParamsType
    ): Promise<MatchDataStatisticsType[]> {
        try {
            const range = validateRoundRangeAndStageStatistics(params);
            const season = await SeasonOpsModel.findById(params.seasonId)
                .select('_id')
                .exec();
            if (!season) {
                throw new Error(`Invalid seasonId: ${params.seasonId}`);
            }
            const documents: PopulatedHistoryGamesStatisticsFindType[] =
                await this.find({
                    season: params.seasonId,
                    games: {
                        $elemMatch: {
                            stage: params.stage,
                            roundNumber: {
                                $gte: range.roundFrom,
                                $lte: range.roundTo
                            }
                        }
                    }
                })
                    .populate<PopulatedHistoryGamesStatisticsFindType>({
                        path: 'games.teamOne.teamId games.teamTwo.teamId',
                        select: 'name coachName'
                    })
                    .populate<PopulatedHistoryGamesStatisticsFindType>({
                        path: 'games.scoreDetails',
                        select: 'teamOne.userId teamOne.calculationDetails teamTwo.userId teamTwo.calculationDetails'
                    })
                    .exec();
            const matches: MatchDataStatisticsType[] = [];
            for (const document of documents) {
                const history =
                    document.toObject<PopulatedHistoryGamesStatisticsType>({
                        flattenObjectIds: true
                    });
                for (const game of history.games) {
                    if (
                        game.stage !== params.stage ||
                        game.roundNumber < range.roundFrom ||
                        game.roundNumber > range.roundTo
                    ) {
                        continue;
                    }
                    const details = game.scoreDetails;
                    if (
                        !details ||
                        !details.teamOne?.userId ||
                        !details.teamTwo?.userId
                    ) {
                        throw new Error(
                            `Archived statistics unavailable for seasonId: ${params.seasonId}`
                        );
                    }
                    if (
                        params.userId &&
                        details.teamOne.userId.toString() !== params.userId &&
                        details.teamTwo.userId.toString() !== params.userId
                    ) {
                        continue;
                    }
                    if (
                        !details.teamOne.calculationDetails ||
                        !details.teamTwo.calculationDetails
                    ) {
                        throw new Error(
                            `Archived statistics unavailable for seasonId: ${params.seasonId}`
                        );
                    }
                    matches.push({
                        matchId: details._id.toString(),
                        seasonId: params.seasonId,
                        stage: params.stage,
                        roundNumber: game.roundNumber,
                        teamOne: {
                            userId: objectIdSchema
                                .unwrap()
                                .parse(details.teamOne.userId),
                            teamName: game.teamOne.teamId?.name ?? '',
                            coachName: game.teamOne.teamId?.coachName ?? '',
                            calculationDetails:
                                teamCalculationDetailsZodSchema.parse(
                                    details.teamOne.calculationDetails
                                )
                        },
                        teamTwo: {
                            userId: objectIdSchema
                                .unwrap()
                                .parse(details.teamTwo.userId),
                            teamName: game.teamTwo.teamId?.name ?? '',
                            coachName: game.teamTwo.teamId?.coachName ?? '',
                            calculationDetails:
                                teamCalculationDetailsZodSchema.parse(
                                    details.teamTwo.calculationDetails
                                )
                        }
                    });
                }
            }
            return matches;
        } catch (error) {
            console.error(
                'Error fetching archived statistics match data:',
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
            const allSchedules = await ScheduleModel.getScheduleForHistory();
            const season = await SeasonOpsModel.findById(seasonId).exec();
            if (!season) {
                throw new Error(`Season not found for id: ${seasonId}`);
            }
            const scheduleData = allSchedules.filter(schedule => {
                return season.isScoreCalculatded[
                    schedule.roundNumber as keyof typeof season.isScoreCalculatded
                ];
            });
            const scoreDetailsData =
                await ScoreDetailsModel.getScoreDetailsForHistory();

            const archiveData = scheduleData.map(schedule => {
                const matchingScoreDetails = scoreDetailsData.find(
                    scoreDetails => {
                        return (
                            scoreDetails.scheduleId?.toString() ===
                            schedule.id.toString()
                        );
                    }
                );
                if (!matchingScoreDetails) {
                    throw new Error(
                        `Score details missing for schedule: ${schedule.id}`
                    );
                }
                return { schedule, matchingScoreDetails };
            });

            let games: HistoryGamesType['games'] = [];
            for (const { schedule, matchingScoreDetails } of archiveData) {
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

                const scoreDetail: HistoryGamesScoreDetailsType = {
                    teamOne: {
                        userId: matchingScoreDetails.teamOne.userId,
                        calculationDetails:
                            matchingScoreDetails.teamOne.calculationDetails,
                        players: matchingScoreDetails.teamOne.players,
                        trainer: matchingScoreDetails.teamOne.trainer,
                        setPlays: matchingScoreDetails.teamOne.setPlays,
                        teamId: teamOneId,
                        score: schedule.userOneScore ?? 0
                    },
                    teamTwo: {
                        userId: matchingScoreDetails.teamTwo.userId,
                        calculationDetails:
                            matchingScoreDetails.teamTwo.calculationDetails,
                        players: matchingScoreDetails.teamTwo.players,
                        trainer: matchingScoreDetails.teamTwo.trainer,
                        setPlays: matchingScoreDetails.teamTwo.setPlays,
                        teamId: teamTwoId,
                        score: schedule.userTwoScore ?? 0
                    }
                };

                const scoreDetailsId =
                    await HistoryGamesScoreDetailsModel.saveScoreDetailToHistory(
                        scoreDetail
                    );

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
            const allSchedules =
                await SchedulePlayoffModel.getScheduleForHistory();
            const season = await SeasonOpsModel.findById(seasonId).exec();
            if (!season) {
                throw new Error(`Season not found for id: ${seasonId}`);
            }
            const scheduleData = allSchedules.filter(schedule => {
                return season.isScoreCalculatdedPlayoff[
                    schedule.roundNumber as keyof typeof season.isScoreCalculatdedPlayoff
                ];
            });
            const scoreDetailsData =
                await ScoreDetailsPlayoffModel.getScoreDetailsForHistory();

            const archiveData = scheduleData.map(schedule => {
                const matchingScoreDetails = scoreDetailsData.find(
                    scoreDetails => {
                        return (
                            scoreDetails.scheduleId?.toString() ===
                            schedule.id.toString()
                        );
                    }
                );
                if (!matchingScoreDetails) {
                    throw new Error(
                        `Score details missing for schedule: ${schedule.id}`
                    );
                }
                return { schedule, matchingScoreDetails };
            });

            let games: HistoryGamesType['games'] = [];
            for (const { schedule, matchingScoreDetails } of archiveData) {
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

                const scoreDetail: HistoryGamesScoreDetailsType = {
                    teamOne: {
                        userId: matchingScoreDetails.teamOne.userId,
                        calculationDetails:
                            matchingScoreDetails.teamOne.calculationDetails,
                        players: matchingScoreDetails.teamOne.players,
                        trainer: matchingScoreDetails.teamOne.trainer,
                        setPlays: matchingScoreDetails.teamOne.setPlays ?? '',
                        teamId: teamOneId,
                        score: schedule.userOneScore ?? 0
                    },
                    teamTwo: {
                        userId: matchingScoreDetails.teamTwo.userId,
                        calculationDetails:
                            matchingScoreDetails.teamTwo.calculationDetails,
                        players: matchingScoreDetails.teamTwo.players,
                        trainer: matchingScoreDetails.teamTwo.trainer,
                        setPlays: matchingScoreDetails.teamTwo.setPlays ?? '',
                        teamId: teamTwoId,
                        score: schedule.userTwoScore ?? 0
                    }
                };

                const scoreDetailsId =
                    await HistoryGamesScoreDetailsModel.saveScoreDetailToHistory(
                        scoreDetail
                    );

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
