import type { TeamCalculationDetailsType } from '@/db/models/schema.types';

import { HydratedDocument, model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    CALCULATION_FUNCTIONS,
    CALCULATION_HEAT_KEYS,
    CALCULATION_RECIPIENT_TYPES,
    CALCULATION_ROLES,
    SET_PLAY_CONTRIBUTION_TYPES
} from '@/db/db.constants';
import { HistoryTeamType } from '@/db/models/history/history-team';
import { PlayersType } from '@/db/models/players';
import {
    SetPlayEnumType,
    historyPlayerSchema,
    historyTeamSchema,
    trainerSchema,
    teamCalculationDetailsZodSchema
} from '@/db/models/schema.types';

//HistoryGames collection represent in each document game played in megaliga
// We will identify all games for given team in given season by finding all documents by teamId and season in historyGames collection

export const historyGamesScoreDetailsZodSchema = z.object({
    teamOne: historyTeamSchema,
    teamTwo: historyTeamSchema
});

export type HistoryGamesScoreDetailsType = z.infer<
    typeof historyGamesScoreDetailsZodSchema
>;

export type HistoryGamesScoreDetailsInputType = z.input<
    typeof historyGamesScoreDetailsZodSchema
>;

type PopulatedHistoryScoreDetailsPlayerType = Omit<
    NonNullable<HistoryGamesScoreDetailsType['teamOne']['players']>[number],
    'playerId'
> & {
    playerId: Pick<PlayersType, 'extraligaPlayerName'>;
};

type HistoryScoreDetailsTeamPlayerReturnType = Omit<
    PopulatedHistoryScoreDetailsPlayerType,
    'playerId'
> & {
    extraligaPlayerName: PlayersType['extraligaPlayerName'];
};

type PopulatedHistoryGamesScoreDetailsType = Omit<
    HistoryGamesScoreDetailsType,
    'teamOne' | 'teamTwo'
> & {
    teamOne: Omit<
        HistoryGamesScoreDetailsType['teamOne'],
        'teamId' | 'players'
    > & {
        teamId: Pick<HistoryTeamType, 'name'>;
        players: PopulatedHistoryScoreDetailsPlayerType[];
    };
    teamTwo: Omit<
        HistoryGamesScoreDetailsType['teamTwo'],
        'teamId' | 'players'
    > & {
        teamId: Pick<HistoryTeamType, 'name'>;
        players: PopulatedHistoryScoreDetailsPlayerType[];
    };
};

type HistoryScoreDetailsTeamReturnType = {
    teamName: HistoryTeamType['name'];
    userId: HistoryGamesScoreDetailsType['teamOne']['userId'];
    calculationDetails: HistoryGamesScoreDetailsType['teamOne']['calculationDetails'];
    players: HistoryScoreDetailsTeamPlayerReturnType[];
    score: HistoryGamesScoreDetailsType['teamOne']['score'];
    trainer: PopulatedHistoryGamesScoreDetailsType['teamOne']['trainer'];
    setPlays: HistoryGamesScoreDetailsType['teamOne']['setPlays'];
};
export interface HistoryGamesScoreDetailsByIdReturnType {
    teamOne: HistoryScoreDetailsTeamReturnType;
    teamTwo: HistoryScoreDetailsTeamReturnType;
}

export type PopulatedFindType =
    HydratedDocument<PopulatedHistoryGamesScoreDetailsType>;

interface HistoryGamesScoreDetailsModelType extends Model<HistoryGamesScoreDetailsType> {
    getHistoryScoreDetailsById: (
        id: string
    ) => Promise<HistoryGamesScoreDetailsByIdReturnType>;
    saveScoreDetailToHistory: (
        scoreDetail: HistoryGamesScoreDetailsInputType
    ) => Promise<string>;
}

const historyGamesScoreDetails = new Schema<
    HistoryGamesScoreDetailsType,
    HistoryGamesScoreDetailsModelType
>({
    teamOne: {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        teamId: {
            type: Schema.Types.ObjectId,
            ref: 'HistoryTeam',
            required: true
        },
        score: { type: Number },
        setPlays: { type: String, default: '' },
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
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        teamId: {
            type: Schema.Types.ObjectId,
            ref: 'HistoryTeam',
            required: true
        },
        score: { type: Number },
        setPlays: { type: String, default: '' },
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

historyGamesScoreDetails.static(
    'getHistoryScoreDetailsById',
    async function getHistoryScoreDetailsById(id: string) {
        try {
            const isValidId = await HistoryGamesScoreDetailsModel.exists({
                _id: id
            });
            if (!isValidId) {
                throw new Error(`Invalid id: ${id}`);
            }

            const scoreDetailsDocument: PopulatedFindType | null =
                await this.findById(id)
                    .populate<PopulatedFindType>({
                        path: 'teamOne.teamId teamTwo.teamId',
                        select: 'name'
                    })
                    .populate<PopulatedFindType>({
                        path: 'teamOne.players.playerId teamTwo.players.playerId',
                        select: 'extraligaPlayerName'
                    })
                    .exec();

            if (!scoreDetailsDocument) {
                throw new Error(`Score details not found for id: ${id}`);
            }

            const mapTeam = (
                team: PopulatedHistoryGamesScoreDetailsType['teamOne']
            ): HistoryScoreDetailsTeamReturnType => {
                return {
                    teamName: team?.teamId.name ?? '',
                    userId: team.userId?.toString(),
                    calculationDetails: team.calculationDetails
                        ? teamCalculationDetailsZodSchema.parse(
                              team.calculationDetails
                          )
                        : undefined,
                    score: team.score,
                    players: (team.players ?? []).map(player => {
                        return {
                            ...historyPlayerSchema
                                .omit({ playerId: true })
                                .parse(player),
                            extraligaPlayerName:
                                player.playerId?.extraligaPlayerName ?? ''
                        };
                    }),
                    trainer: team.trainer
                        ? trainerSchema.parse(team.trainer)
                        : undefined,
                    setPlays: team?.setPlays
                };
            };

            const scoreDetails =
                scoreDetailsDocument.toObject<PopulatedHistoryGamesScoreDetailsType>(
                    {
                        flattenObjectIds: true
                    }
                );
            return {
                teamOne: mapTeam(scoreDetails.teamOne),
                teamTwo: mapTeam(scoreDetails.teamTwo)
            };
        } catch (error) {
            console.error('Error fetching history score details by id:', error);
            throw error;
        }
    }
);

historyGamesScoreDetails.static(
    'saveScoreDetailToHistory',
    async function saveScoreDetailToHistory(
        scoreDetail: HistoryGamesScoreDetailsInputType
    ) {
        try {
            const newDocument = await this.create(scoreDetail);

            return newDocument._id.toString();
        } catch (error) {
            console.error('Error saving score details to history:', error);
            throw error;
        }
    }
);

const HistoryGamesScoreDetailsModel = model<
    HistoryGamesScoreDetailsType,
    HistoryGamesScoreDetailsModelType
>('HistoryGamesScoreDetails', historyGamesScoreDetails);

export default HistoryGamesScoreDetailsModel;
