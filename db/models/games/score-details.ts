import { HydratedDocument, model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    DEFAULT_PLAYER_SCORE_DETAILS,
    PlayerScoreDetailsType,
    PlayerScoreDetailsInputType
} from '@/db/db.types';
import ScheduleModel, { ScheduleType } from '@/db/models/games/schedule';
import SetPlaysDataModel, {
    SetPlayUserDataType
} from '@/db/models/games/set-plays-data';
import { StartingLineupPlayersByRoundReturnType } from '@/db/models/games/starting-lineup';
import PlayersModel, { PlayersType } from '@/db/models/players';
import {
    heatScoresSchema,
    playerSchema,
    trainerSchema,
    objectIdSchema,
    roundNumberSchema,
    teamSchema
} from '@/db/models/schema.types';
import { SetPlaysType } from '@/db/models/set-plays';
import UserModel, { UserType } from '@/db/models/user';

export type { PlayerScoreDetailsType };

//ScoreDetails is representation of megaliga_scores of old megaliga database. Will be used for displaying detailed scores of given match.

export const scoreDetailsZodSchema = z.object({
    scheduleId: objectIdSchema, //Reference to Schedule model, from which we will populate main scores
    roundNumber: roundNumberSchema, //needed to properly identify document for different use cases
    teamOne: teamSchema,
    teamTwo: teamSchema
});

export type ScoreDetailsType = z.infer<typeof scoreDetailsZodSchema>;

export type ScoreDetailsInputType = z.input<typeof scoreDetailsZodSchema>;

type PopulatedScoreDetailsPlayerType = Omit<
    NonNullable<ScoreDetailsType['teamOne']['players']>[number],
    'playerId'
> & {
    playerId: Pick<PlayersType, 'extraligaPlayerName'>;
};

type PopulatedScoreDetailsType = Omit<
    ScoreDetailsType,
    'scheduleId' | 'teamOne' | 'teamTwo'
> & {
    scheduleId: Pick<ScheduleType, 'userOneScore' | 'userTwoScore'>;
    teamOne: Omit<ScoreDetailsType['teamOne'], 'userId' | 'players'> & {
        userId: Pick<UserType, 'teamName'>;
        players: PopulatedScoreDetailsPlayerType[];
    };
    teamTwo: Omit<ScoreDetailsType['teamTwo'], 'userId' | 'players'> & {
        userId: Pick<UserType, 'teamName'>;
        players: PopulatedScoreDetailsPlayerType[];
    };
};
export type PopulatedFindType = HydratedDocument<PopulatedScoreDetailsType>;

type ScoreDetailsTeamPlayerReturnType = Omit<
    PopulatedScoreDetailsPlayerType,
    'playerId'
> & {
    extraligaPlayerName: PlayersType['extraligaPlayerName'];
};

type ScoreDetailsSetPlayReturnType = Pick<SetPlaysType, 'name' | 'type'> & {
    userData: SetPlayUserDataType | null;
};

type ScoreDetailsTeamReturnType = {
    teamName: PopulatedScoreDetailsType['teamOne']['userId']['teamName'];
    players: ScoreDetailsTeamPlayerReturnType[];
    trainer: PopulatedScoreDetailsType['teamOne']['trainer'];
    setPlays: ScoreDetailsSetPlayReturnType[];
};

export type ScoreDetailsReturnType = {
    roundNumber: ScoreDetailsType['roundNumber'];
    teamOne: ScoreDetailsTeamReturnType;
    teamTwo: ScoreDetailsTeamReturnType;
    userOneScore: PopulatedScoreDetailsType['scheduleId']['userOneScore'];
    userTwoScore: PopulatedScoreDetailsType['scheduleId']['userTwoScore'];
};

type ScoreDetailsForHistoryTeamReturnType = {
    players: NonNullable<ScoreDetailsType['teamOne']['players']>;
    trainer: ScoreDetailsType['teamOne']['trainer'];
    setPlays: string[];
};

export type ScoreDetailsForHistoryReturnType = {
    scheduleId: ScoreDetailsType['scheduleId'];
    teamOne: ScoreDetailsForHistoryTeamReturnType;
    teamTwo: ScoreDetailsForHistoryTeamReturnType;
};

type ScoreDetailsTeamType = 'teamOne' | 'teamTwo';

export type PlayerScoreDetailsReturnType = {
    scoreDetailsId: string | null;
    teamType: ScoreDetailsTeamType | null;
    playerScoreDetails: PlayerScoreDetailsType;
};

export type SavePlayerScoreDetailsReturnType = {
    success: boolean;
};

interface ScoreDetailsModelType extends Model<ScoreDetailsType> {
    getScoreDetailsByScheduleAndRoundId: (
        scheduleId: string,
        roundNumber: number
    ) => Promise<ScoreDetailsReturnType>;
    getScoreDetailsForHistory: () => Promise<
        ScoreDetailsForHistoryReturnType[]
    >;
    getPlayerScoreDetailsByRoundAndUserId: (
        roundNumber: number,
        userId: string,
        playerId: string
    ) => Promise<PlayerScoreDetailsReturnType>;
    savePlayerScoreDetails: (
        playerData: StartingLineupPlayersByRoundReturnType,
        roundNumber: number,
        playerScore: PlayerScoreDetailsInputType
    ) => Promise<SavePlayerScoreDetailsReturnType>;
    isScoreCalculationsEnabled: (roundNumber: number) => Promise<boolean>;
    deleteAll: () => Promise<void>;
}

const scoreDetailsSchema = new Schema<ScoreDetailsType, ScoreDetailsModelType>({
    scheduleId: { type: Schema.Types.ObjectId, ref: 'Schedule' },
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
        startingLineupId: { type: Schema.Types.ObjectId, ref: 'StartingLineup' }
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
        startingLineupId: { type: Schema.Types.ObjectId, ref: 'StartingLineup' }
    }
});

scoreDetailsSchema.static(
    'getScoreDetailsByScheduleAndRoundId',
    async function getScoreDetailsByScheduleAndRoundId(
        scheduleId: string,
        roundNumber: number
    ) {
        try {
            const isValidScheduleId = await ScheduleModel.exists({
                _id: scheduleId
            });

            if (!isValidScheduleId) {
                throw new Error(`Invalid scheduleId: ${scheduleId}`);
            }

            const document: PopulatedFindType | null = await this.findOne({
                scheduleId,
                roundNumber
            })
                .populate<PopulatedFindType>({
                    path: 'scheduleId',
                    select: 'userOneScore userTwoScore'
                })
                .populate<PopulatedFindType>({
                    path: 'teamOne.userId',
                    select: 'teamName'
                })
                .populate<PopulatedFindType>({
                    path: 'teamTwo.userId',
                    select: 'teamName'
                })
                .populate<PopulatedFindType>({
                    path: 'teamOne.players.playerId',
                    select: 'extraligaPlayerName'
                })
                .populate<PopulatedFindType>({
                    path: 'teamTwo.players.playerId',
                    select: 'extraligaPlayerName'
                })
                .exec();

            if (!document) {
                throw new Error(
                    `Score details for scheduleId: ${scheduleId} and roundNumber: ${roundNumber} not found`
                );
            }

            const mapTeam = async (
                team: PopulatedScoreDetailsType['teamOne']
            ): Promise<ScoreDetailsTeamReturnType> => {
                const { setPlayList } = team.startingLineupId
                    ? await SetPlaysDataModel.getSetPlayListByStartingLineupId(
                          team.startingLineupId.toString()
                      )
                    : { setPlayList: [] };

                return {
                    teamName: team.userId?.teamName ?? '',
                    players: (team.players ?? []).map(player => {
                        return {
                            ...trainerSchema.parse(player),
                            extraligaPlayerName:
                                player.playerId?.extraligaPlayerName ?? ''
                        };
                    }),
                    trainer: team.trainer
                        ? trainerSchema.parse(team.trainer)
                        : undefined,
                    setPlays: setPlayList.map(play => {
                        return {
                            name: play.name,
                            type: play.type,
                            userData: 'userData' in play ? play.userData : null
                        };
                    })
                };
            };
            const [teamOne, teamTwo] = await Promise.all([
                mapTeam(document.teamOne),
                mapTeam(document.teamTwo)
            ]);

            return {
                roundNumber: document.roundNumber,
                teamOne,
                teamTwo,
                userOneScore: document.scheduleId?.userOneScore,
                userTwoScore: document.scheduleId?.userTwoScore
            };
        } catch (error) {
            console.error('Error fetching score details:', error);
            throw error;
        }
    }
);

scoreDetailsSchema.static(
    'getScoreDetailsForHistory',
    async function getScoreDetailsForHistory() {
        try {
            const documents = await this.find().exec();

            if (!documents.length) {
                throw new Error('Score details not found');
            }

            const mapTeam = async (
                team: ScoreDetailsType['teamOne']
            ): Promise<ScoreDetailsForHistoryTeamReturnType> => {
                const { setPlayList } = team.startingLineupId
                    ? await SetPlaysDataModel.getSetPlayListByStartingLineupId(
                          team.startingLineupId.toString()
                      )
                    : { setPlayList: [] };

                return {
                    players: (team.players ?? []).map(player => {
                        return {
                            ...trainerSchema.parse(player),
                            playerId: player.playerId?.toString()
                        };
                    }),
                    trainer: team.trainer
                        ? trainerSchema.parse(team.trainer)
                        : undefined,
                    setPlays: setPlayList.map(play => play.name)
                };
            };

            return await Promise.all(
                documents.map(async document => {
                    const [teamOne, teamTwo] = await Promise.all([
                        mapTeam(document.teamOne),
                        mapTeam(document.teamTwo)
                    ]);

                    return {
                        scheduleId: document.scheduleId,
                        teamOne,
                        teamTwo
                    };
                })
            );
        } catch (error) {
            console.error(
                'Error fetching score details data for history:',
                error
            );
            throw error;
        }
    }
);

scoreDetailsSchema.static('deleteAll', async function deleteAll() {
    try {
        await this.deleteMany({});
    } catch (error) {
        console.error('Error deleting all score details:', error);
        throw error;
    }
});

scoreDetailsSchema.static(
    'getPlayerScoreDetailsByRoundAndUserId',
    async function getPlayerScoreDetailsByRoundAndUserId(
        roundNumber: number,
        userId: string,
        playerId: string
    ) {
        try {
            if (roundNumber < 1 || roundNumber > 14) {
                throw new Error(
                    `Invalid roundNumber: ${roundNumber}. Must be between 1 and 14`
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

            const teamType: ScoreDetailsTeamType =
                document.teamOne.userId?.toString() === userId
                    ? 'teamOne'
                    : 'teamTwo';

            const playerEntry = document[teamType].players?.find(
                player => player.playerId?.toString() === playerId
            );

            const playerScoreDetails: PlayerScoreDetailsType = playerEntry
                ? heatScoresSchema.parse(playerEntry)
                : DEFAULT_PLAYER_SCORE_DETAILS;

            return {
                scoreDetailsId: document._id.toString(),
                teamType,
                playerScoreDetails
            };
        } catch (error) {
            console.error('Error fetching player score details:', error);
            throw error;
        }
    }
);

scoreDetailsSchema.static(
    'savePlayerScoreDetails',
    async function savePlayerScoreDetails(
        playerData: StartingLineupPlayersByRoundReturnType,
        roundNumber: number,
        playerScore: PlayerScoreDetailsInputType
    ) {
        try {
            const normalizedPlayerScore = heatScoresSchema.parse(playerScore);

            for (let index = 0; index < playerData.userId.length; index++) {
                const userId = playerData.userId[index];
                const startingLineupId = playerData.startingLineupId[index];

                const schedule =
                    await ScheduleModel.getScheduleIdByUserAndRoundNumber(
                        userId ?? '',
                        roundNumber
                    );

                if (!schedule) {
                    throw new Error(
                        `Schedule not found for userId: ${userId} and roundNumber: ${roundNumber}`
                    );
                }

                const teamKey: ScoreDetailsTeamType =
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
                    players.push(
                        playerSchema.parse({
                            playerId: playerData.playerId,
                            ...normalizedPlayerScore
                        })
                    );
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
            console.error('Error saving player score details:', error);
            throw error;
        }
    }
);

scoreDetailsSchema.static(
    'isScoreCalculationsEnabled',
    async function isScoreCalculationsEnabled(roundNumber: number) {
        try {
            if (roundNumber < 1 || roundNumber > 14) {
                throw new Error(
                    `Invalid roundNumber: ${roundNumber}. Must be between 1 and 14`
                );
            }

            const documents = await this.find({ roundNumber }).exec();

            if (documents.length < 6) {
                return false;
            }

            const isTeamComplete = (
                team: ScoreDetailsType['teamOne']
            ): boolean => {
                const players = team.players ?? [];

                if (players.length !== 5) {
                    return false;
                }

                return players.every(player => {
                    return (
                        player.heatOne != null &&
                        player.heatTwo != null &&
                        player.heatThree != null &&
                        player.heatFour != null &&
                        player.heatFive != null &&
                        player.heatSix != null &&
                        player.heatSeven != null
                    );
                });
            };

            return documents.every(document => {
                return (
                    isTeamComplete(document.teamOne) &&
                    isTeamComplete(document.teamTwo)
                );
            });
        } catch (error) {
            console.error('Error checking score calculations status:', error);
            throw error;
        }
    }
);

const ScoreDetailsModel = model<ScoreDetailsType, ScoreDetailsModelType>(
    'ScoreDetails',
    scoreDetailsSchema
);

export default ScoreDetailsModel;
