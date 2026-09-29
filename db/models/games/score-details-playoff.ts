import { HydratedDocument, model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    DEFAULT_PLAYER_SCORE_DETAILS,
    PlayerScoreDetailsType
} from '@/db/db.types';
import SchedulePlayoffModel, {
    SchedulePlayoffType
} from '@/db/models/games/schedule-playoff';
import {
    StartingLineupPlayoffPlayersByRoundReturnType,
    StartingLineupPlayoffType
} from '@/db/models/games/starting-lineup-playoff';
import PlayersModel, { PlayersType } from '@/db/models/players';
import {
    objectIdSchema,
    roundNumberSchema,
    teamSchema
} from '@/db/models/schema.types';
import UserModel, { UserType } from '@/db/models/user';

//ScoreDetailsPLayoff is representation of megaliga_scores_playoff of old megaliga database. Will be used for displaying detailed scores of given match in plaoffs.

export const scoreDetailsPLayoffZodSchema = z.object({
    scheduleId: objectIdSchema, //Reference to SchedulePlayoff model, from which we will populate main scores and round number
    roundNumber: roundNumberSchema, //needed to properly identify document for different use cases
    teamOne: teamSchema,
    teamTwo: teamSchema
});

export type ScoreDetailsPlayoffType = z.infer<
    typeof scoreDetailsPLayoffZodSchema
>;

type PopulatedScoreDetailsPlayoffPlayerType = Omit<
    NonNullable<ScoreDetailsPlayoffType['teamOne']['players']>[number],
    'playerId'
> & {
    playerId: Pick<PlayersType, 'extraligaPlayerName'>;
};

type PopulatedScoreDetailsPlayoffType = Omit<
    ScoreDetailsPlayoffType,
    'scheduleId' | 'teamOne' | 'teamTwo'
> & {
    scheduleId: Pick<SchedulePlayoffType, 'userOneScore' | 'userTwoScore'>;
    teamOne: Omit<
        ScoreDetailsPlayoffType['teamOne'],
        'userId' | 'players' | 'startingLineupId'
    > & {
        userId: Pick<UserType, 'teamName'>;
        players: PopulatedScoreDetailsPlayoffPlayerType[];
        startingLineupId: Pick<StartingLineupPlayoffType, 'setPlays'>;
    };
    teamTwo: Omit<
        ScoreDetailsPlayoffType['teamTwo'],
        'userId' | 'players' | 'startingLineupId'
    > & {
        userId: Pick<UserType, 'teamName'>;
        players: PopulatedScoreDetailsPlayoffPlayerType[];
        startingLineupId: Pick<StartingLineupPlayoffType, 'setPlays'>;
    };
};

export type PopulatedFindType =
    HydratedDocument<PopulatedScoreDetailsPlayoffType>;

type ScoreDetailsPlayoffTeamPlayerDtoType = Omit<
    PopulatedScoreDetailsPlayoffPlayerType,
    'playerId'
> & {
    extraligaPlayerName: PlayersType['extraligaPlayerName'];
};

type ScoreDetailsPlayoffTeamDtoType = {
    teamName: PopulatedScoreDetailsPlayoffType['teamOne']['userId']['teamName'];
    players: ScoreDetailsPlayoffTeamPlayerDtoType[];
    trainer: PopulatedScoreDetailsPlayoffType['teamOne']['trainer'];
    setPlays: PopulatedScoreDetailsPlayoffType['teamOne']['startingLineupId']['setPlays'];
};

export type ScoreDetailsPlayoffDtoType = {
    roundNumber: ScoreDetailsPlayoffType['roundNumber'];
    teamOne: ScoreDetailsPlayoffTeamDtoType;
    teamTwo: ScoreDetailsPlayoffTeamDtoType;
    userOneScore: PopulatedScoreDetailsPlayoffType['scheduleId']['userOneScore'];
    userTwoScore: PopulatedScoreDetailsPlayoffType['scheduleId']['userTwoScore'];
};

type ScoreDetailsPlayoffForHistoryTeamDtoType = {
    players: NonNullable<ScoreDetailsPlayoffType['teamOne']['players']>;
    trainer: ScoreDetailsPlayoffType['teamOne']['trainer'];
    setPlays: StartingLineupPlayoffType['setPlays'];
};

export type ScoreDetailsPlayoffForHistoryReturnType = {
    scheduleId: ScoreDetailsPlayoffType['scheduleId'];
    teamOne: ScoreDetailsPlayoffForHistoryTeamDtoType;
    teamTwo: ScoreDetailsPlayoffForHistoryTeamDtoType;
};

type PopulatedScoreDetailsPlayoffForHistoryType = Omit<
    ScoreDetailsPlayoffType,
    'teamOne' | 'teamTwo'
> & {
    teamOne: Omit<ScoreDetailsPlayoffType['teamOne'], 'startingLineupId'> & {
        startingLineupId?: Pick<StartingLineupPlayoffType, 'setPlays'>;
    };
    teamTwo: Omit<ScoreDetailsPlayoffType['teamTwo'], 'startingLineupId'> & {
        startingLineupId?: Pick<StartingLineupPlayoffType, 'setPlays'>;
    };
};

type ScoreDetailsPlayoffTeamType = 'teamOne' | 'teamTwo';

export type PlayerScoreDetailsPlayoffType = PlayerScoreDetailsType;

export type PlayerScoreDetailsPlayoffReturnType = {
    scoreDetailsId: string | null;
    teamType: ScoreDetailsPlayoffTeamType | null;
    playerScoreDetails: PlayerScoreDetailsPlayoffType;
};

export type SavePlayerScoreDetailsPlayoffReturnType = {
    success: boolean;
};

interface ScoreDetailsPlayoffModelType extends Model<ScoreDetailsPlayoffType> {
    getScoreDetailsByScheduleAndRoundId: (
        scheduleId: string,
        roundNumber: number
    ) => Promise<ScoreDetailsPlayoffDtoType>;
    getScoreDetailsForHistory: () => Promise<
        ScoreDetailsPlayoffForHistoryReturnType[]
    >;
    getPlayerScoreDetailsByRoundAndUserId: (
        roundNumber: number,
        userId: string,
        playerId: string
    ) => Promise<PlayerScoreDetailsPlayoffReturnType>;
    savePlayerScoreDetails: (
        playerData: StartingLineupPlayoffPlayersByRoundReturnType,
        roundNumber: number,
        playerScore: PlayerScoreDetailsPlayoffType
    ) => Promise<SavePlayerScoreDetailsPlayoffReturnType>;
    deleteAll: () => Promise<void>;
}

const scoreDetailsPlayoffSchema = new Schema<
    ScoreDetailsPlayoffType,
    ScoreDetailsPlayoffModelType
>({
    scheduleId: { type: Schema.Types.ObjectId, ref: 'SchedulePlayoff' },
    roundNumber: { type: Number, required: true },
    teamOne: {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        players: [
            {
                playerId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Players',
                    required: true
                },
                heatOne: { type: Number },
                heatTwo: { type: Number },
                heatThree: { type: Number },
                heatFour: { type: Number },
                heatFive: { type: Number },
                heatSix: { type: Number },
                heatSeven: { type: Number },
                setPlay: { type: Number },
                comment: { type: String }
            }
        ],
        trainer: {
            heatOne: { type: Number },
            heatTwo: { type: Number },
            heatThree: { type: Number },
            heatFour: { type: Number },
            heatFive: { type: Number },
            heatSix: { type: Number },
            heatSeven: { type: Number },
            setPlay: { type: Number },
            comment: { type: String }
        },
        startingLineupId: {
            type: Schema.Types.ObjectId,
            ref: 'StartingLineupPlayoff'
        }
    },
    teamTwo: {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        players: [
            {
                playerId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Players',
                    required: true
                },
                heatOne: { type: Number },
                heatTwo: { type: Number },
                heatThree: { type: Number },
                heatFour: { type: Number },
                heatFive: { type: Number },
                heatSix: { type: Number },
                heatSeven: { type: Number },
                setPlay: { type: Number },
                comment: { type: String }
            }
        ],
        trainer: {
            heatOne: { type: Number },
            heatTwo: { type: Number },
            heatThree: { type: Number },
            heatFour: { type: Number },
            heatFive: { type: Number },
            heatSix: { type: Number },
            heatSeven: { type: Number },
            setPlay: { type: Number },
            comment: { type: String }
        },
        startingLineupId: {
            type: Schema.Types.ObjectId,
            ref: 'StartingLineupPlayoff'
        }
    }
});

scoreDetailsPlayoffSchema.static(
    'getScoreDetailsByScheduleAndRoundId',
    async function getScoreDetailsByScheduleIdAndRound(
        scheduleId: string,
        roundNumber: number
    ) {
        try {
            const isValidScheduleId = await SchedulePlayoffModel.exists({
                _id: scheduleId
            });

            if (!isValidScheduleId) {
                throw new Error(`Invalid scheduleId: ${scheduleId}`);
            }

            const document = (await this.findOne({
                scheduleId,
                roundNumber
            })
                .populate({
                    path: 'scheduleId',
                    select: 'userOneScore userTwoScore'
                })
                .populate({
                    path: 'teamOne.userId',
                    select: 'teamName'
                })
                .populate({
                    path: 'teamTwo.userId',
                    select: 'teamName'
                })
                .populate({
                    path: 'teamOne.players.playerId',
                    select: 'extraligaPlayerName'
                })
                .populate({
                    path: 'teamTwo.players.playerId',
                    select: 'extraligaPlayerName'
                })
                .populate({
                    path: 'teamOne.startingLineupId',
                    select: 'setPlays'
                })
                .populate({
                    path: 'teamTwo.startingLineupId',
                    select: 'setPlays'
                })
                .exec()) as PopulatedFindType | null;

            if (!document) {
                throw new Error(
                    `Score details for scheduleId: ${scheduleId} and roundNumber: ${roundNumber} not found`
                );
            }

            const mapTeam = (
                team: PopulatedScoreDetailsPlayoffType['teamOne']
            ): ScoreDetailsPlayoffTeamDtoType => ({
                teamName: team.userId?.teamName ?? '',
                players: (team.players ?? []).map(player => ({
                    heatOne: player.heatOne,
                    heatTwo: player.heatTwo,
                    heatThree: player.heatThree,
                    heatFour: player.heatFour,
                    heatFive: player.heatFive,
                    heatSix: player.heatSix,
                    heatSeven: player.heatSeven,
                    setPlay: player.setPlay,
                    comment: player.comment,
                    extraligaPlayerName:
                        player.playerId?.extraligaPlayerName ?? ''
                })),
                trainer: team.trainer,
                setPlays: team.startingLineupId?.setPlays
            });

            return {
                roundNumber: document.roundNumber,
                teamOne: mapTeam(document.teamOne),
                teamTwo: mapTeam(document.teamTwo),
                userOneScore: document.scheduleId?.userOneScore,
                userTwoScore: document.scheduleId?.userTwoScore
            };
        } catch (error) {
            console.error('Error fetching score details playoff:', error);
            throw error;
        }
    }
);

scoreDetailsPlayoffSchema.static(
    'getScoreDetailsForHistory',
    async function getScoreDetailsForHistory() {
        try {
            const documents: PopulatedScoreDetailsPlayoffForHistoryType[] =
                await this.find()
                    .populate<{
                        teamOne: PopulatedScoreDetailsPlayoffForHistoryType['teamOne'];
                    }>({
                        path: 'teamOne.startingLineupId',
                        select: 'setPlays'
                    })
                    .populate<{
                        teamTwo: PopulatedScoreDetailsPlayoffForHistoryType['teamTwo'];
                    }>({
                        path: 'teamTwo.startingLineupId',
                        select: 'setPlays'
                    })
                    .exec();

            if (!documents.length) {
                throw new Error('Score details not found');
            }

            const mapTeam = (
                team: PopulatedScoreDetailsPlayoffForHistoryType['teamOne']
            ): ScoreDetailsPlayoffForHistoryTeamDtoType => {
                return {
                    players: team.players ?? [],
                    trainer: team.trainer,
                    setPlays: team.startingLineupId?.setPlays
                };
            };

            return documents.map(document => {
                return {
                    scheduleId: document.scheduleId,
                    teamOne: mapTeam(document.teamOne),
                    teamTwo: mapTeam(document.teamTwo)
                };
            });
        } catch (error) {
            console.error(
                'Error fetching score details playoff data for history:',
                error
            );
            throw error;
        }
    }
);

scoreDetailsPlayoffSchema.static('deleteAll', async function deleteAll() {
    try {
        await this.deleteMany({});
    } catch (error) {
        console.error('Error deleting all score details playoff:', error);
        throw error;
    }
});

scoreDetailsPlayoffSchema.static(
    'getPlayerScoreDetailsByRoundAndUserId',
    async function getPlayerScoreDetailsByRoundAndUserId(
        roundNumber: number,
        userId: string,
        playerId: string
    ) {
        try {
            if (roundNumber < 1 || roundNumber > 4) {
                throw new Error(
                    `Invalid roundNumber: ${roundNumber}. Must be between 1 and 4`
                );
            }

            const isValidUserId = await UserModel.exists({ _id: userId });
            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }

            const isValidPlayerId = await PlayersModel.exists({
                _id: playerId
            });
            if (!isValidPlayerId) {
                throw new Error(`Invalid playerId: ${playerId}`);
            }

            const document = await this.findOne({
                roundNumber,
                $or: [
                    { 'teamOne.userId': userId },
                    { 'teamTwo.userId': userId }
                ]
            }).exec();

            if (!document) {
                return {
                    scoreDetailsId: null,
                    teamType: null,
                    playerScoreDetails: DEFAULT_PLAYER_SCORE_DETAILS
                };
            }

            const teamType: ScoreDetailsPlayoffTeamType =
                document.teamOne.userId?.toString() === userId
                    ? 'teamOne'
                    : 'teamTwo';

            const playerEntry = document[teamType].players?.find(
                player => player.playerId?.toString() === playerId
            );

            const playerScoreDetails: PlayerScoreDetailsPlayoffType =
                playerEntry
                    ? {
                          heatOne: playerEntry.heatOne,
                          heatTwo: playerEntry.heatTwo,
                          heatThree: playerEntry.heatThree,
                          heatFour: playerEntry.heatFour,
                          heatFive: playerEntry.heatFive,
                          heatSix: playerEntry.heatSix,
                          heatSeven: playerEntry.heatSeven
                      }
                    : DEFAULT_PLAYER_SCORE_DETAILS;

            return {
                scoreDetailsId: document._id.toString(),
                teamType,
                playerScoreDetails
            };
        } catch (error) {
            console.error(
                'Error fetching playoff player score details:',
                error
            );
            throw error;
        }
    }
);

scoreDetailsPlayoffSchema.static(
    'savePlayerScoreDetails',
    async function savePlayerScoreDetails(
        playerData: StartingLineupPlayoffPlayersByRoundReturnType,
        roundNumber: number,
        playerScore: PlayerScoreDetailsPlayoffType
    ) {
        try {
            const normalizedPlayerScore: PlayerScoreDetailsPlayoffType = {
                heatOne: playerScore.heatOne ?? 0,
                heatTwo: playerScore.heatTwo ?? 0,
                heatThree: playerScore.heatThree ?? 0,
                heatFour: playerScore.heatFour ?? 0,
                heatFive: playerScore.heatFive ?? 0,
                heatSix: playerScore.heatSix ?? 0,
                heatSeven: playerScore.heatSeven ?? 0
            };

            for (let index = 0; index < playerData.userId.length; index++) {
                const userId = playerData.userId[index];
                const startingLineupId = playerData.startingLineupId[index];

                const schedule =
                    await SchedulePlayoffModel.getScheduleIdByUserAndRoundNumber(
                        userId ?? '',
                        roundNumber
                    );

                if (!schedule) {
                    throw new Error(
                        `Schedule not found for userId: ${userId} and roundNumber: ${roundNumber}`
                    );
                }

                const teamKey: ScoreDetailsPlayoffTeamType =
                    schedule.userOneId === userId ? 'teamOne' : 'teamTwo';

                const document = await this.findOne({
                    scheduleId: schedule.scheduleId,
                    roundNumber
                }).exec();

                const players = document?.[teamKey].players ?? [];
                const existingPlayerIndex = players.findIndex(player => {
                    return player.playerId?.toString() === playerData.playerId;
                });

                if (existingPlayerIndex >= 0) {
                    players[existingPlayerIndex] = {
                        ...players[existingPlayerIndex],
                        playerId: playerData.playerId,
                        ...normalizedPlayerScore
                    };
                } else {
                    players.push({
                        playerId: playerData.playerId,
                        ...normalizedPlayerScore
                    });
                }

                await this.updateOne(
                    { scheduleId: schedule.scheduleId, roundNumber },
                    {
                        $set: {
                            [`${teamKey}.userId`]: userId,
                            [`${teamKey}.startingLineupId`]: startingLineupId,
                            [`${teamKey}.players`]: players
                        }
                    },
                    { upsert: true }
                );
            }

            return { success: true };
        } catch (error) {
            console.error('Error saving playoff player score details:', error);
            throw error;
        }
    }
);

const ScoreDetailsPlayoffModel = model<
    ScoreDetailsPlayoffType,
    ScoreDetailsPlayoffModelType
>('ScoreDetailsPlayoff', scoreDetailsPlayoffSchema);

export default ScoreDetailsPlayoffModel;
