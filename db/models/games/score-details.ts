import type { GetSetPlaysDetailsReturnType } from '@/db/db.types';

import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { getSetPlaysDetails } from '@/db/db.utils';
import ScheduleModel, { ScheduleType } from '@/db/models/games/schedule';
import SetPlaysDataModel from '@/db/models/games/set-plays-data';
import {
    StartingLineupPlayersByRoundReturnType,
    StartingLineupType
} from '@/db/models/games/starting-lineup';
import PlayersModel, { PlayersType } from '@/db/models/players';
import {
    HistoryPlayerType,
    historyPlayerSchema,
    playerScoresZodSchema,
    regularSeasonPlayerSchema,
    regularSeasonTeamSchema,
    trainerSchema,
    objectIdSchema,
    roundNumberSchema
} from '@/db/models/schema.types';
import UserModel, { UserType } from '@/db/models/user';

export type RegularSeasonPlayerScoreDetailsType = z.infer<
    typeof playerScoresZodSchema
>;

export type RegularSeasonPlayerScoreDetailsInputType = z.input<
    typeof playerScoresZodSchema
>;

//ScoreDetails is representation of megaliga_scores of old megaliga database. Will be used for displaying detailed scores of given match.

export const scoreDetailsZodSchema = z.object({
    scheduleId: objectIdSchema, //Reference to Schedule model, from which we will populate main scores
    roundNumber: roundNumberSchema, //needed to properly identify document for different use cases
    teamOne: regularSeasonTeamSchema,
    teamTwo: regularSeasonTeamSchema
});

export type ScoreDetailsType = z.infer<typeof scoreDetailsZodSchema>;

export type ScoreDetailsInputType = z.input<typeof scoreDetailsZodSchema>;

type PopulatedScoreDetailsPlayerType = Omit<
    NonNullable<ScoreDetailsType['teamOne']['players']>[number],
    'playerId'
> & {
    playerId: Pick<PlayersType, 'extraligaPlayerName'>;
};

type PopulatedScoreDetailsStartingLineupType = {
    _id: Types.ObjectId;
    roles: StartingLineupType['roles'];
};

type PopulatedScoreDetailsTeamWithLineupType = Omit<
    ScoreDetailsType['teamOne'],
    'startingLineupId'
> & {
    startingLineupId?: PopulatedScoreDetailsStartingLineupType | null;
};

type PopulatedScoreDetailsForHistoryType = Omit<
    ScoreDetailsType,
    'teamOne' | 'teamTwo'
> & {
    teamOne: PopulatedScoreDetailsTeamWithLineupType;
    teamTwo: PopulatedScoreDetailsTeamWithLineupType;
};

type PopulatedScoreDetailsForHistoryFindType =
    HydratedDocument<PopulatedScoreDetailsForHistoryType>;

type PopulatedScoreDetailsType = Omit<
    ScoreDetailsType,
    'scheduleId' | 'teamOne' | 'teamTwo'
> & {
    scheduleId: Pick<ScheduleType, 'userOneScore' | 'userTwoScore'>;
    teamOne: Omit<
        PopulatedScoreDetailsTeamWithLineupType,
        'userId' | 'players'
    > & {
        userId: Pick<UserType, 'teamName'>;
        players: PopulatedScoreDetailsPlayerType[];
    };
    teamTwo: Omit<
        PopulatedScoreDetailsTeamWithLineupType,
        'userId' | 'players'
    > & {
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

type ScoreDetailsTeamReturnType = GetSetPlaysDetailsReturnType & {
    teamName: PopulatedScoreDetailsType['teamOne']['userId']['teamName'];
    players: ScoreDetailsTeamPlayerReturnType[];
    trainer: PopulatedScoreDetailsType['teamOne']['trainer'];
};

export type ScoreDetailsReturnType = {
    roundNumber: ScoreDetailsType['roundNumber'];
    teamOne: ScoreDetailsTeamReturnType;
    teamTwo: ScoreDetailsTeamReturnType;
    userOneScore: PopulatedScoreDetailsType['scheduleId']['userOneScore'];
    userTwoScore: PopulatedScoreDetailsType['scheduleId']['userTwoScore'];
};

type ScoreDetailsForHistoryTeamReturnType = {
    players: HistoryPlayerType[];
    trainer: ScoreDetailsType['teamOne']['trainer'];
    setPlays: string;
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
    playerScoreDetails: RegularSeasonPlayerScoreDetailsType;
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
        playerScore: RegularSeasonPlayerScoreDetailsInputType
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
                _id: false,
                playerId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Players',
                    required: true
                },
                heatOne: {
                    // For all heats: undefined means not submitted; null means saved with no start.
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatTwo: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatThree: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatFour: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatFive: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatSix: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatSeven: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
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
                _id: false,
                playerId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Players',
                    required: true
                },
                heatOne: {
                    // For all heats: undefined means not submitted; null means saved with no start.
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatTwo: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatThree: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatFour: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatFive: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatSix: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
                heatSeven: {
                    value: { type: Number },
                    bonus: { type: Boolean, default: false },
                    isNominated: { type: Boolean, default: false }
                },
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
                .populate<PopulatedFindType>({
                    path: 'teamOne.startingLineupId teamTwo.startingLineupId',
                    select: 'roles'
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
                          team.startingLineupId._id.toString()
                      )
                    : { setPlayList: [] };

                const setPlaysDetails = await getSetPlaysDetails({
                    setPlayList,
                    roles: team.startingLineupId?.roles
                });

                return {
                    teamName: team.userId?.teamName ?? '',
                    players: (team.players ?? []).map(player => {
                        return {
                            ...regularSeasonPlayerSchema
                                .omit({ playerId: true })
                                .parse(player),
                            extraligaPlayerName:
                                player.playerId?.extraligaPlayerName ?? ''
                        };
                    }),
                    trainer: team.trainer
                        ? trainerSchema.parse(team.trainer)
                        : undefined,
                    ...setPlaysDetails
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
            const documents: PopulatedScoreDetailsForHistoryFindType[] =
                await this.find()
                    .populate<PopulatedScoreDetailsForHistoryFindType>({
                        path: 'teamOne.startingLineupId teamTwo.startingLineupId',
                        select: 'roles'
                    })
                    .exec();

            if (!documents.length) {
                throw new Error('Score details not found');
            }

            const mapTeam = async (
                team: PopulatedScoreDetailsTeamWithLineupType
            ): Promise<ScoreDetailsForHistoryTeamReturnType> => {
                const { setPlayList } = team.startingLineupId
                    ? await SetPlaysDataModel.getSetPlayListByStartingLineupId(
                          team.startingLineupId._id.toString()
                      )
                    : { setPlayList: [] };

                const setPlaysDetails = await getSetPlaysDetails({
                    setPlayList,
                    roles: team.startingLineupId?.roles
                });

                return {
                    players: (team.players ?? []).map(player => {
                        return historyPlayerSchema.parse({
                            playerId: player.playerId?.toString(),
                            heatOne: player.heatOne.value,
                            heatTwo: player.heatTwo.value,
                            heatThree: player.heatThree.value,
                            heatFour: player.heatFour.value,
                            heatFive: player.heatFive.value,
                            heatSix: player.heatSix.value,
                            heatSeven: player.heatSeven.value,
                            setPlay: player.setPlay,
                            comment: player.comment
                        });
                    }),
                    trainer: team.trainer
                        ? trainerSchema.parse(team.trainer)
                        : undefined,
                    setPlays: setPlaysDetails.setPlayDescriptions
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
                    playerScoreDetails: playerScoresZodSchema.parse({})
                };
            }

            const teamType: ScoreDetailsTeamType =
                document.teamOne.userId?.toString() === userId
                    ? 'teamOne'
                    : 'teamTwo';

            const playerEntry = document[teamType].players?.find(
                player => player.playerId?.toString() === playerId
            );

            const playerScoreDetails: RegularSeasonPlayerScoreDetailsType =
                playerScoresZodSchema.parse(playerEntry ?? {});

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
        playerScore: RegularSeasonPlayerScoreDetailsInputType
    ) {
        try {
            const normalizedPlayerScore =
                playerScoresZodSchema.parse(playerScore);

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
                        regularSeasonPlayerSchema.parse({
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
                        player.heatOne?.value !== undefined &&
                        player.heatTwo?.value !== undefined &&
                        player.heatThree?.value !== undefined &&
                        player.heatFour?.value !== undefined &&
                        player.heatFive?.value !== undefined &&
                        player.heatSix?.value !== undefined &&
                        player.heatSeven?.value !== undefined
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
