import type {
    CalculationTeamType,
    CalculateMatchScoresReturnType,
    GetSetPlaysDetailsReturnType
} from '@/db/db.types';
import type {
    PlayerScoresType,
    PlayerScoresInputType,
    TeamCalculationDetailsType
} from '@/db/models/schema.types';

import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import {
    MIN_REGULAR_SEASON_MATCH_COUNT,
    MIN_REGULAR_SEASON_ROUND,
    MAX_REGULAR_SEASON_ROUND,
    STARTING_LINEUP_PLAYER_COUNT,
    STARTING_LINEUP_POSITION_KEYS,
    CALCULATION_FUNCTIONS,
    CALCULATION_HEAT_KEYS,
    CALCULATION_RECIPIENT_TYPES,
    CALCULATION_ROLES,
    SET_PLAY_CONTRIBUTION_TYPES
} from '@/db/db.constants';
import { areRoundScoresComplete, getSetPlaysDetails } from '@/db/db.utils';
import ScheduleModel, { ScheduleType } from '@/db/models/games/schedule';
import SetPlaysDataModel, {
    setPlayPayloadZodSchema
} from '@/db/models/games/set-plays-data';
import {
    StartingLineupPlayersByRoundReturnType,
    StartingLineupType
} from '@/db/models/games/starting-lineup';
import PlayersModel, { PlayersType } from '@/db/models/players';
import {
    HistoryPlayerType,
    historyPlayerSchema,
    playerScoresZodSchema,
    playerSchema,
    teamSchema,
    trainerSchema,
    objectIdSchema,
    roundNumberSchema,
    SetPlayEnumType
} from '@/db/models/schema.types';
import SeasonOpsModel from '@/db/models/season-ops';
import UserModel, { UserType } from '@/db/models/user';
import { calculateMatchScores } from '@/db/score-calculation.utils';

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
    playerScoreDetails: PlayerScoresType;
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
        playerScore: PlayerScoresInputType
    ) => Promise<SavePlayerScoreDetailsReturnType>;
    isScoreCalculationsEnabled: (roundNumber: number) => Promise<boolean>;
    calculateScoresByRound: (roundNumber: number) => Promise<void>;
    deleteAll: () => Promise<void>;
}

type PopulatedScoreDetailsCalculationTeamType = Omit<
    ScoreDetailsType['teamOne'],
    'startingLineupId'
> & {
    startingLineupId: (StartingLineupType & { _id: Types.ObjectId }) | null;
};

type PopulatedScoreDetailsCalculationType = Omit<
    ScoreDetailsType,
    'scheduleId' | 'teamOne' | 'teamTwo'
> & {
    scheduleId: (ScheduleType & { _id: Types.ObjectId }) | null;
    teamOne: PopulatedScoreDetailsCalculationTeamType;
    teamTwo: PopulatedScoreDetailsCalculationTeamType;
};

type PopulatedScoreDetailsCalculationFindType =
    HydratedDocument<PopulatedScoreDetailsCalculationType>;

type ScoreDetailsRoundCalculationType = {
    document: PopulatedScoreDetailsCalculationFindType;
    result: CalculateMatchScoresReturnType;
};

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
        startingLineupId: { type: Schema.Types.ObjectId, ref: 'StartingLineup' },
        calculationDetails: {
            type: new Schema<TeamCalculationDetailsType>(
                {
                    players: [
                        {
                            _id: false,
                            playerId: {
                                type: Schema.Types.ObjectId,
                                ref: 'Players',
                                required: true
                            },
                            nominalPlayerId: {
                                type: Schema.Types.ObjectId,
                                ref: 'Players',
                                required: true
                            },
                            actualStartCount: {
                                type: Number,
                                required: true,
                                min: 0,
                                max: CALCULATION_HEAT_KEYS.length
                            },
                            basePoints: { type: Number, required: true },
                            functionPoints: { type: Number, required: true },
                            rolePoints: { type: Number, required: true },
                            setPlayPoints: { type: Number, required: true },
                            function: {
                                type: String,
                                enum: [...CALCULATION_FUNCTIONS, null]
                            },
                            role: {
                                type: String,
                                enum: [...CALCULATION_ROLES, null]
                            }
                        }
                    ],
                    trainer: {
                        heatPoints: { type: Number, required: true },
                        setPlayPoints: { type: Number, required: true }
                    },
                    setPlayResults: [
                        {
                            _id: false,
                            selectedSetPlayId: {
                                type: Schema.Types.ObjectId,
                                required: true
                            },
                            setPlayId: {
                                type: Schema.Types.ObjectId,
                                required: true
                            },
                            name: { type: String, required: true },
                            type: {
                                type: String,
                                enum: Object.values(SetPlayEnumType),
                                required: true
                            },
                            recipients: [
                                {
                                    _id: false,
                                    recipientType: {
                                        type: String,
                                        enum: CALCULATION_RECIPIENT_TYPES,
                                        required: true
                                    },
                                    playerId: {
                                        type: Schema.Types.ObjectId,
                                        ref: 'Players'
                                    },
                                    nominalPlayerId: {
                                        type: Schema.Types.ObjectId,
                                        ref: 'Players'
                                    },
                                    calculatedPoints: {
                                        type: Number,
                                        required: true
                                    },
                                    creditedPoints: {
                                        type: Number,
                                        required: true
                                    },
                                    setPlayContributionType: {
                                        type: String,
                                        enum: SET_PLAY_CONTRIBUTION_TYPES,
                                        required: true
                                    }
                                }
                            ]
                        }
                    ],
                    floorAdjustment: { type: Number, required: true, min: 0 }
                },
                { _id: false }
            ),
            default: undefined
        }
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
        startingLineupId: { type: Schema.Types.ObjectId, ref: 'StartingLineup' },
        calculationDetails: {
            type: new Schema<TeamCalculationDetailsType>(
                {
                    players: [
                        {
                            _id: false,
                            playerId: {
                                type: Schema.Types.ObjectId,
                                ref: 'Players',
                                required: true
                            },
                            nominalPlayerId: {
                                type: Schema.Types.ObjectId,
                                ref: 'Players',
                                required: true
                            },
                            actualStartCount: {
                                type: Number,
                                required: true,
                                min: 0,
                                max: CALCULATION_HEAT_KEYS.length
                            },
                            basePoints: { type: Number, required: true },
                            functionPoints: { type: Number, required: true },
                            rolePoints: { type: Number, required: true },
                            setPlayPoints: { type: Number, required: true },
                            function: {
                                type: String,
                                enum: [...CALCULATION_FUNCTIONS, null]
                            },
                            role: {
                                type: String,
                                enum: [...CALCULATION_ROLES, null]
                            }
                        }
                    ],
                    trainer: {
                        heatPoints: { type: Number, required: true },
                        setPlayPoints: { type: Number, required: true }
                    },
                    setPlayResults: [
                        {
                            _id: false,
                            selectedSetPlayId: {
                                type: Schema.Types.ObjectId,
                                required: true
                            },
                            setPlayId: {
                                type: Schema.Types.ObjectId,
                                required: true
                            },
                            name: { type: String, required: true },
                            type: {
                                type: String,
                                enum: Object.values(SetPlayEnumType),
                                required: true
                            },
                            recipients: [
                                {
                                    _id: false,
                                    recipientType: {
                                        type: String,
                                        enum: CALCULATION_RECIPIENT_TYPES,
                                        required: true
                                    },
                                    playerId: {
                                        type: Schema.Types.ObjectId,
                                        ref: 'Players'
                                    },
                                    nominalPlayerId: {
                                        type: Schema.Types.ObjectId,
                                        ref: 'Players'
                                    },
                                    calculatedPoints: {
                                        type: Number,
                                        required: true
                                    },
                                    creditedPoints: {
                                        type: Number,
                                        required: true
                                    },
                                    setPlayContributionType: {
                                        type: String,
                                        enum: SET_PLAY_CONTRIBUTION_TYPES,
                                        required: true
                                    }
                                }
                            ]
                        }
                    ],
                    floorAdjustment: { type: Number, required: true, min: 0 }
                },
                { _id: false }
            ),
            default: undefined
        }
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
                            ...playerSchema
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

            const playerScoreDetails: PlayerScoresType =
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
        playerScore: PlayerScoresInputType
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

            return areRoundScoresComplete({
                documents,
                minimumMatchCount: MIN_REGULAR_SEASON_MATCH_COUNT
            });
        } catch (error) {
            console.error('Error checking score calculations status:', error);
            throw error;
        }
    }
);

scoreDetailsSchema.static(
    'calculateScoresByRound',
    async function calculateScoresByRound(roundNumber: number) {
        try {
            if (
                roundNumber < MIN_REGULAR_SEASON_ROUND ||
                roundNumber > MAX_REGULAR_SEASON_ROUND
            ) {
                throw new Error(
                    `Invalid roundNumber: ${roundNumber}. Must be between ${MIN_REGULAR_SEASON_ROUND} and ${MAX_REGULAR_SEASON_ROUND}`
                );
            }
            const documents: PopulatedScoreDetailsCalculationFindType[] =
                await this.find({ roundNumber })
                    .populate<PopulatedScoreDetailsCalculationFindType>({
                        path: 'scheduleId',
                        select: 'roundNumber userOneId userTwoId'
                    })
                    .populate<PopulatedScoreDetailsCalculationFindType>({
                        path: 'teamOne.startingLineupId',
                        select: 'userId roundNumber playerOne playerTwo playerThree playerFour playerFive roles'
                    })
                    .populate<PopulatedScoreDetailsCalculationFindType>({
                        path: 'teamTwo.startingLineupId',
                        select: 'userId roundNumber playerOne playerTwo playerThree playerFour playerFive roles'
                    })
                    .exec();
            if (
                !areRoundScoresComplete({
                    documents,
                    minimumMatchCount: MIN_REGULAR_SEASON_MATCH_COUNT
                })
            ) {
                throw new Error(
                    `Score details are incomplete for round: ${roundNumber}`
                );
            }

            const currentSeason = await SeasonOpsModel.findOne({
                isCurrentSeason: true
            }).exec();

            if (!currentSeason) {
                throw new Error('Current season not found');
            }

            const scheduleIds = new Set(
                documents.map(document => document.scheduleId?._id.toString())
            );

            if (
                scheduleIds.size !== documents.length ||
                (await ScheduleModel.countDocuments({ roundNumber })) !==
                    documents.length
            ) {
                throw new Error(
                    `Schedule coverage is incomplete for round: ${roundNumber}`
                );
            }

            const calculations: ScoreDetailsRoundCalculationType[] = [];
            for (const document of documents) {
                const schedule = document.scheduleId;
                if (
                    !schedule ||
                    schedule.roundNumber !== roundNumber ||
                    schedule.userOneId?.toString() !==
                        document.teamOne.userId?.toString() ||
                    schedule.userTwoId?.toString() !==
                        document.teamTwo.userId?.toString()
                ) {
                    throw new Error(
                        `Invalid schedule for score details: ${document._id}`
                    );
                }
                const teams: CalculationTeamType[] = [];
                for (const team of [document.teamOne, document.teamTwo]) {
                    const startingLineup = team.startingLineupId;
                    const userId = team.userId?.toString();
                    if (
                        !startingLineup ||
                        startingLineup.roundNumber !== roundNumber ||
                        startingLineup.userId?.toString() !== userId
                    ) {
                        throw new Error(
                            `Invalid starting lineup for user: ${userId}`
                        );
                    }
                    const positions = Object.fromEntries(
                        STARTING_LINEUP_POSITION_KEYS.map(key => {
                            return [key, startingLineup[key]?.toString()];
                        })
                    );
                    const positionIds = STARTING_LINEUP_POSITION_KEYS.map(key =>
                        startingLineup[key]?.toString()
                    );
                    const playerScores = team.players!;
                    if (
                        new Set(positionIds).size !==
                            STARTING_LINEUP_PLAYER_COUNT ||
                        positionIds.some(id => {
                            return (
                                !id ||
                                !playerScores.some(
                                    player => player.playerId?.toString() === id
                                )
                            );
                        })
                    ) {
                        throw new Error(
                            `Starting lineup players do not match score details for user: ${userId}`
                        );
                    }
                    const { setPlayList } =
                        await SetPlaysDataModel.getSetPlayListByStartingLineupId(
                            startingLineup._id.toString()
                        );
                    for (const setPlay of setPlayList) {
                        setPlayPayloadZodSchema.parse(setPlay);
                    }
                    const replacementIds = setPlayList.flatMap(setPlay => {
                        return setPlay.type === SetPlayEnumType.Rezerwa ||
                            setPlay.type === SetPlayEnumType.RezerwaGielda ||
                            (setPlay.type === SetPlayEnumType.Awatar &&
                                !setPlay.adminData?.isDisabled)
                            ? [setPlay.userData.playerId]
                            : [];
                    });
                    const players = await PlayersModel.find({
                        _id: { $in: [...positionIds, ...replacementIds] }
                    })
                        .select('isJunior')
                        .exec();
                    const playerMetadata = players.map(player => {
                        return {
                            playerId: player._id.toString(),
                            isJunior: player.isJunior
                        };
                    });
                    const mappedPlayers = playerScores.map(player => {
                        const playerId = player.playerId!.toString();
                        const metadata = playerMetadata.find(
                            item => item.playerId === playerId
                        );
                        if (!metadata) {
                            throw new Error(`Missing player: ${playerId}`);
                        }
                        return {
                            ...playerScoresZodSchema.parse(player),
                            ...metadata,
                            setPlay: 0,
                            comment: ''
                        };
                    });
                    teams.push({
                        players: mappedPlayers,
                        startingLineup: {
                            playerOne: positions.playerOne,
                            playerTwo: positions.playerTwo,
                            playerThree: positions.playerThree,
                            playerFour: positions.playerFour,
                            playerFive: positions.playerFive,
                            roles: {
                                pn: {
                                    playerId:
                                        startingLineup.roles.pn.playerId.toString(),
                                    isDisabled:
                                        startingLineup.roles.pn.isDisabled
                                },
                                kb: startingLineup.roles.kb.toString(),
                                p: startingLineup.roles.p.toString()
                            }
                        },
                        setPlayList,
                        replacementPlayers: playerMetadata.filter(player =>
                            replacementIds.includes(player.playerId)
                        )
                    });
                }
                const result = calculateMatchScores({
                    roundNumber,
                    teamOne: teams[0],
                    teamTwo: teams[1]
                });
                for (const team of [result.teamOne, result.teamTwo]) {
                    playerSchema.array().parse(team.players);
                    trainerSchema.parse(team.trainer);
                }
                calculations.push({ document, result });
            }
            const userIds = documents.flatMap(document => {
                return [document.teamOne.userId, document.teamTwo.userId];
            });
            if (
                (await UserModel.countDocuments({
                    _id: { $in: userIds }
                }).exec()) !== userIds.length
            ) {
                throw new Error(`Missing team user for round: ${roundNumber}`);
            }
            for (const { document, result } of calculations) {
                document.set({
                    'teamOne.players': result.teamOne.players,
                    'teamOne.trainer': result.teamOne.trainer,
                    'teamTwo.players': result.teamTwo.players,
                    'teamTwo.trainer': result.teamTwo.trainer
                });
                await document.save();
                await ScheduleModel.updateOne(
                    { _id: document.scheduleId!._id, roundNumber },
                    {
                        $set: {
                            userOneScore: result.teamOneScore,
                            userTwoScore: result.teamTwoScore
                        }
                    }
                );
            }
            await currentSeason.updateSeason({
                isScoreCalculatded: {
                    ...currentSeason.isScoreCalculatded,
                    [roundNumber]: true
                }
            });
        } catch (error) {
            console.error('Error calculating round scores:', error);
            throw error;
        }
    }
);

const ScoreDetailsModel = model<ScoreDetailsType, ScoreDetailsModelType>(
    'ScoreDetails',
    scoreDetailsSchema
);

export default ScoreDetailsModel;
