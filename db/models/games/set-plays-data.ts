import type { SetPlaysType } from '@/db/models/set-plays';

import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import {
    MAX_SET_PLAYS_PER_ROUND,
    MIN_REGULAR_SEASON_ROUND,
    MAX_REGULAR_SEASON_ROUND,
    STARTING_LINEUP_PLAYER_COUNT,
    BRUDNA_PALA_LEADER_COUNT
} from '@/db/db.constants';
import { normalizeSetPlayData } from '@/db/db.utils';
import StartingLineupModel from '@/db/models/games/starting-lineup';
import {
    attemptZodSchema,
    heatScoresSchema,
    numberSchema,
    objectIdSchema,
    SetPlayEnumType,
    uniquePlayerIdList
} from '@/db/models/schema.types';
import UserModel from '@/db/models/user';
import {
    validateSetPlayConstraints,
    validateSetPlays
} from '@/db/models/validation.utils';

import '@/db/models/set-plays';

const setPlayPayloadZodSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal(SetPlayEnumType.GwarancjaStartow),
        userData: z.object({ playerId: objectIdSchema }).required()
    }),
    z.object({
        type: z.literal(SetPlayEnumType.Remis),
        adminData: z
            .record(objectIdSchema.unwrap(), z.boolean())
            .refine(
                results =>
                    Object.keys(results).length ===
                    STARTING_LINEUP_PLAYER_COUNT,
                'Remis requires five player results'
            )
            .optional()
    }),
    z.object({
        type: z.literal(SetPlayEnumType.Rezerwa),
        userData: z.object({ playerId: objectIdSchema }).required(),
        adminData: heatScoresSchema.default({})
    }),
    z.object({
        type: z.literal(SetPlayEnumType.RezerwaGielda),
        userData: z.object({ playerId: objectIdSchema }).required(),
        adminData: heatScoresSchema.default({})
    }),
    z.object({
        type: z.literal(SetPlayEnumType.MortalKombatCombo)
    }),
    z.object({
        type: z.literal(SetPlayEnumType.Muchomor)
    }),
    z.object({
        type: z.literal(SetPlayEnumType.Ncd),
        adminData: z
            .object({
                playerIdList: uniquePlayerIdList.refine(
                    ids => ids.length === 4,
                    'Four players are required'
                )
            })
            .optional()
    }),
    z.object({
        type: z.literal(SetPlayEnumType.Ncd6),
        adminData: z
            .object({
                playerIdList: uniquePlayerIdList.refine(
                    ids => ids.length === 4,
                    'Four players are required'
                )
            })
            .optional()
    }),
    z.object({
        type: z.literal(SetPlayEnumType.Spartacus),
        userData: z
            .object({
                ownPlayerId: objectIdSchema,
                opponentPlayerId: objectIdSchema
            })
            .required(),
        adminData: z
            .object({
                ownAverage: numberSchema,
                opponentAverage: numberSchema
            })
            .optional()
    }),
    z.object({
        type: z.literal(SetPlayEnumType.PijanyCieslak)
    }),
    z.object({
        type: z.literal(SetPlayEnumType.BrudnaPala),
        userData: z.object({
            leaderIdList: uniquePlayerIdList.refine(
                ids => ids.length === BRUDNA_PALA_LEADER_COUNT,
                'Four leaders are required'
            )
        }),
        adminData: z
            .record(objectIdSchema.unwrap(), z.boolean())
            .refine(
                results =>
                    Object.keys(results).length === BRUDNA_PALA_LEADER_COUNT,
                'BrudnaPala requires four player results'
            )
            .optional()
    }),
    z.object({
        type: z.literal(SetPlayEnumType.PauloSousa)
    }),
    z.object({
        type: z.literal(SetPlayEnumType.RyszardKowalski),
        userData: z.object({ playerId: objectIdSchema }).required()
    }),
    z.object({
        type: z.literal(SetPlayEnumType.Typer),
        userData: z
            .object({
                playerId: objectIdSchema,
                attemptOne: attemptZodSchema,
                attemptTwo: attemptZodSchema
            })
            .required()
    }),
    z.object({
        type: z.literal(SetPlayEnumType.Taktyczna)
    }),
    z.object({
        type: z.literal(SetPlayEnumType.Awatar),
        userData: z.object({ playerId: objectIdSchema }).required(),
        adminData: heatScoresSchema.default({})
    }),
    z.object({
        type: z.literal(SetPlayEnumType.KoloFortunyNorbiego),
        userData: z
            .object({
                minimum: numberSchema,
                maximum: numberSchema
            })
            .refine(
                data => data.minimum <= data.maximum,
                'Minimum must not exceed maximum'
            )
    })
]);

const setPlayPayloadListZodSchema = setPlayPayloadZodSchema
    .array()
    .max(MAX_SET_PLAYS_PER_ROUND)
    .superRefine(validateSetPlays);

export type SetPlayPayloadType = z.infer<typeof setPlayPayloadZodSchema>;
type SetPlayPayloadInputType = z.input<typeof setPlayPayloadZodSchema>;

export type SetPlayUserDataType = Extract<
    SetPlayPayloadType,
    { userData: unknown }
>['userData'];
export type SetPlayAdminDataType = NonNullable<
    Extract<SetPlayPayloadType, { adminData?: unknown }>['adminData']
>;
type SetPlayUserInputType = Extract<
    SetPlayPayloadInputType,
    { userData: unknown }
>['userData'];
type SetPlayAdminInputType = NonNullable<
    Extract<SetPlayPayloadInputType, { adminData?: unknown }>['adminData']
>;

type SetPlayListItemType = {
    _id: Types.ObjectId;
    setPlayId: Types.ObjectId;
    userData?: SetPlayUserDataType;
    adminData?: SetPlayAdminDataType;
};

export type SetPlaysDataType = {
    startingLineupId: Types.ObjectId;
    setPlayList: SetPlayListItemType[];
};

type PopulatedSetPlayType = {
    _id: Types.ObjectId;
    name: SetPlaysType['name'];
    type: SetPlaysType['type'];
};

type PopulatedSetPlayListItemType = Omit<SetPlayListItemType, 'setPlayId'> & {
    setPlayId: PopulatedSetPlayType;
};

export type PopulatedSetPlaysDataType = Omit<
    SetPlaysDataType,
    'setPlayList'
> & {
    setPlayList: PopulatedSetPlayListItemType[];
};

export type PopulatedFindType = HydratedDocument<
    PopulatedSetPlaysDataType,
    SetPlaysDataMethodsType
>;

export type SetPlayDataType = {
    setPlayId: string;
    selectedSetPlayId?: string;
    userData?: SetPlayUserInputType | null;
    adminData?: SetPlayAdminInputType;
};

export type SetPlaysDataSelectionReturnType = SetPlayPayloadType & {
    name: string;
    setPlayId: string;
    selectedSetPlayId: string;
};
export type SetPlaysDataForUserReturnType = Pick<SetPlaysType, 'name'> & {
    userData: SetPlayUserDataType | null;
};
export type SetPlaysDataForAdminReturnType = Pick<
    SetPlaysType,
    'name' | 'type'
> & {
    selectedSetPlayId: string;
    setPlayId: string;
    adminData: SetPlayAdminDataType | null;
};

export type SetPlaysDataListByStartingLineupIdReturnType = {
    setPlayList: SetPlaysDataSelectionReturnType[];
};

interface SetPlaysDataMethodsType {
    saveSelectedSetPlay: () => Promise<SetPlaysDataSelectionReturnType[]>;
}

interface SetPlaysDataModelType extends Model<
    SetPlaysDataType,
    '',
    SetPlaysDataMethodsType
> {
    getSetPlayListByStartingLineupId: (
        startingLineupId: string
    ) => Promise<SetPlaysDataListByStartingLineupIdReturnType>;
    getSetPlaysForUser: (
        startingLineupId: string
    ) => Promise<SetPlaysDataForUserReturnType[]>;
    getSetPlaysForAdmin: (
        roundNumber: number,
        userId: string
    ) => Promise<SetPlaysDataForAdminReturnType[]>;
    saveSetPlay: (
        startingLineupId: string,
        setPlayData: SetPlayDataType,
        setPlayType: SetPlayEnumType
    ) => Promise<SetPlaysDataSelectionReturnType[]>;
    updateSetPlay: (
        startingLineupId: string,
        selectedSetPlayId: string,
        setPlayData: SetPlayDataType
    ) => Promise<SetPlaysDataSelectionReturnType[]>;
    removeSetPlay: (
        startingLineupId: string,
        selectedSetPlayId: string
    ) => Promise<SetPlaysDataSelectionReturnType[]>;
    saveAdminSetPlay: (
        roundNumber: string,
        userId: string,
        setPlayData: SetPlayDataType[]
    ) => Promise<void>;
}

const setPlayListSchema = new Schema<SetPlayListItemType>({
    setPlayId: {
        type: Schema.Types.ObjectId,
        ref: 'SetPlays',
        required: true
    },
    // Catalog-dependent payloads are parsed by the validation hook before saving.
    userData: { type: Schema.Types.Mixed, default: undefined },
    adminData: { type: Schema.Types.Mixed, default: undefined }
});
const setPlaysDataSchema = new Schema<
    SetPlaysDataType,
    SetPlaysDataModelType,
    SetPlaysDataMethodsType
>({
    startingLineupId: {
        type: Schema.Types.ObjectId,
        ref: 'StartingLineup',
        required: true,
        unique: true
    },
    setPlayList: { type: [setPlayListSchema], default: [] }
});

setPlaysDataSchema.pre('validate', async function validateSetPlayDocument() {
    const document = this.toObject({
        depopulate: true,
        flattenObjectIds: true
    });
    objectIdSchema.unwrap().parse(document.startingLineupId);
    document.setPlayList.forEach(play => {
        objectIdSchema.unwrap().parse(play.setPlayId);
    });
    const populated = await this.populate<PopulatedFindType>({
        path: 'setPlayList.setPlayId',
        select: 'name type'
    });
    const plays = populated
        .toObject<PopulatedSetPlaysDataType>({
            flattenObjectIds: true,
            // Keep empty payloads so validation can reject missing required fields.
            minimize: false
        })
        .setPlayList.map(({ _id, setPlayId, ...play }) => {
            if (!setPlayId) {
                throw new Error(
                    'Set play with provided setPlayId does not exists'
                );
            }
            return {
                ...play,
                setPlayId: setPlayId._id.toString(),
                name: setPlayId.name,
                type: setPlayId.type,
                selectedSetPlayId: _id.toString()
            } as SetPlaysDataSelectionReturnType;
        });
    const entries = setPlayPayloadListZodSchema.parse(plays);
    this.depopulate('setPlayList.setPlayId');
    this.set(
        'setPlayList',
        entries.map((entry, index) => {
            if (
                entry.type === SetPlayEnumType.BrudnaPala &&
                entry.adminData === undefined
            ) {
                entry.adminData = Object.fromEntries(
                    entry.userData.leaderIdList.map(playerId => {
                        return [playerId, false];
                    })
                );
            }
            return {
                _id: plays[index].selectedSetPlayId,
                setPlayId: plays[index].setPlayId,
                ...('userData' in entry
                    ? { userData: normalizeSetPlayData(entry.userData) }
                    : {}),
                ...('adminData' in entry && entry.adminData !== undefined
                    ? {
                          adminData:
                              entry.type === SetPlayEnumType.Remis ||
                              entry.type === SetPlayEnumType.BrudnaPala
                                  ? Object.fromEntries(
                                        Object.entries(entry.adminData).map(
                                            ([playerId, isSelected]) => {
                                                return [
                                                    playerId.toLowerCase(),
                                                    isSelected
                                                ];
                                            }
                                        )
                                    )
                                  : normalizeSetPlayData(entry.adminData)
                      }
                    : {})
            };
        })
    );
});

// adds selected set play to setPlayList and returns updated list of set plays.
// Will be used to render list of selected set plays
setPlaysDataSchema.method(
    'saveSelectedSetPlay',
    async function saveSelectedSetPlay() {
        try {
            await this.save();
            const document = await this.populate<PopulatedFindType>({
                path: 'setPlayList.setPlayId',
                select: 'name type'
            });
            return document
                .toObject<PopulatedSetPlaysDataType>({ flattenObjectIds: true })
                .setPlayList.map(({ _id, setPlayId, ...play }) => {
                    return {
                        ...play,
                        selectedSetPlayId: _id.toString(),
                        setPlayId: setPlayId._id.toString(),
                        name: setPlayId.name,
                        type: setPlayId.type
                    } as SetPlaysDataSelectionReturnType;
                });
        } catch (error) {
            console.error('Error saving selected set play:', error);
            throw error;
        }
    }
);

// returns selected set plays for given startingLineupId.
// Used in set-plays.getAvailableSetPlays for validation purposes
setPlaysDataSchema.static(
    'getSetPlayListByStartingLineupId',
    async function getSetPlayListByStartingLineupId(
        startingLineupId: string
    ): Promise<SetPlaysDataListByStartingLineupIdReturnType> {
        try {
            const document: PopulatedFindType | null = await this.findOne({
                startingLineupId
            })
                .select('setPlayList')
                .populate<PopulatedFindType>({
                    path: 'setPlayList.setPlayId',
                    select: 'name type'
                })
                .exec();

            if (!document) {
                return { setPlayList: [] };
            }

            return {
                setPlayList: document
                    .toObject<PopulatedSetPlaysDataType>({
                        flattenObjectIds: true
                    })
                    .setPlayList.map(({ _id, setPlayId, ...play }) => {
                        return {
                            ...play,
                            setPlayId: setPlayId._id.toString(),
                            name: setPlayId.name,
                            type: setPlayId.type,
                            selectedSetPlayId: _id.toString()
                        } as SetPlaysDataSelectionReturnType;
                    })
            };
        } catch (error) {
            console.error(
                'Error fetching set play list by startingLineupId:',
                error
            );
            throw error;
        }
    }
);

// on dashboard view we will know userId and roundNumber, so we will be able to get startingLineupId, that should be passed to this function. User will be able to add set plays only after saving staring lineup. This will assure, startingLineupId will be found
setPlaysDataSchema.static(
    'getSetPlaysForUser',
    async function getSetPlaysForUser(
        startingLineupId: string
    ): Promise<SetPlaysDataForUserReturnType[]> {
        try {
            const setPlayDocument: PopulatedFindType | null =
                await this.findOne({
                    startingLineupId
                })
                    .select('setPlayList.setPlayId setPlayList.userData')
                    .populate<PopulatedFindType>({
                        path: 'setPlayList.setPlayId',
                        select: 'name type'
                    })
                    .exec();

            if (!setPlayDocument) {
                return [];
            }

            return setPlayDocument
                .toObject({ flattenObjectIds: true })
                .setPlayList.map(setPlay => {
                    if (!setPlay.setPlayId) {
                        throw new Error(
                            'Missing catalog entry for selected set play'
                        );
                    }
                    return {
                        name: setPlay.setPlayId.name,
                        userData: setPlay.userData ?? null
                    };
                });
        } catch (error) {
            console.error('Error fetching set plays for user:', error);
            throw error;
        }
    }
);

setPlaysDataSchema.static(
    'getSetPlaysForAdmin',
    async function getSetPlaysForAdmin(
        roundNumber: number,
        userId: string
    ): Promise<SetPlaysDataForAdminReturnType[]> {
        try {
            if (
                roundNumber < MIN_REGULAR_SEASON_ROUND ||
                roundNumber > MAX_REGULAR_SEASON_ROUND
            ) {
                throw new Error(
                    `Invalid roundNumber: ${roundNumber}. Must be between ${MIN_REGULAR_SEASON_ROUND} and ${MAX_REGULAR_SEASON_ROUND}`
                );
            }

            const isValidUserId = await UserModel.exists({ _id: userId });
            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }

            const startingLineupDocument =
                await StartingLineupModel.getUserStartingLineupByRound(
                    userId,
                    roundNumber
                );
            if (!startingLineupDocument) {
                return [];
            }

            const setPlayDocument: PopulatedFindType | null =
                await this.findOne({
                    startingLineupId: startingLineupDocument._id
                })
                    .select(
                        'setPlayList._id setPlayList.setPlayId setPlayList.adminData'
                    )
                    .populate<PopulatedFindType>({
                        path: 'setPlayList.setPlayId',
                        select: 'name type'
                    })
                    .exec();

            if (!setPlayDocument) {
                return [];
            }

            return setPlayDocument
                .toObject({ flattenObjectIds: true })
                .setPlayList.map(setPlay => {
                    if (!setPlay.setPlayId) {
                        throw new Error(
                            'Missing catalog entry for selected set play'
                        );
                    }
                    let adminData = setPlay.adminData ?? null;
                    if (
                        setPlay.setPlayId.type === SetPlayEnumType.Remis &&
                        adminData === null
                    ) {
                        adminData = Object.fromEntries(
                            [
                                startingLineupDocument.playerOne,
                                startingLineupDocument.playerTwo,
                                startingLineupDocument.playerThree,
                                startingLineupDocument.playerFour,
                                startingLineupDocument.playerFive
                            ].map(playerId => {
                                return [playerId!.toString(), false];
                            })
                        );
                    }
                    return {
                        selectedSetPlayId: setPlay._id.toString(),
                        setPlayId: setPlay.setPlayId._id.toString(),
                        name: setPlay.setPlayId.name,
                        type: setPlay.setPlayId.type,
                        adminData
                    };
                });
        } catch (error) {
            console.error('Error fetching set plays for admin:', error);
            throw error;
        }
    }
);

setPlaysDataSchema.static(
    'saveSetPlay',
    async function saveSetPlay(
        startingLineupId: string,
        setPlayData: SetPlayDataType,
        setPlayType: SetPlayEnumType
    ) {
        try {
            const startingLineupExists = await StartingLineupModel.exists({
                _id: startingLineupId
            });
            if (!startingLineupExists) {
                throw new Error(
                    `Invalid startingLineupId: ${startingLineupId}`
                );
            }

            const existingDocument: PopulatedFindType | null =
                await this.findOne({ startingLineupId })
                    .populate<PopulatedFindType>({
                        path: 'setPlayList.setPlayId',
                        select: 'type'
                    })
                    .exec();
            const availableTypes = validateSetPlayConstraints(
                existingDocument?.setPlayList.map(item => item.setPlayId) ?? []
            );
            if (!availableTypes.includes(setPlayType)) {
                throw new Error(
                    'Selected set play cannot be added due to megaliga setPlays rules'
                );
            }

            const document = existingDocument ?? new this({ startingLineupId });
            document.depopulate('setPlayList.setPlayId');
            document.set('setPlayList', [
                ...document.setPlayList,
                {
                    setPlayId: setPlayData.setPlayId,
                    userData: setPlayData.userData
                }
            ]);
            return await document.saveSelectedSetPlay();
        } catch (error) {
            console.error('Error saving set play:', error);
            throw error;
        }
    }
);

setPlaysDataSchema.static(
    'updateSetPlay',
    async function updateSetPlay(
        startingLineupId: string,
        selectedSetPlayId: string,
        setPlayData: SetPlayDataType
    ): Promise<SetPlaysDataSelectionReturnType[]> {
        try {
            const document = await this.findOne({ startingLineupId }).exec();
            if (!document) {
                throw new Error('No set plays for starting lineup');
            }

            const selectedSetPlays = document.toObject().setPlayList;
            const selectedSetPlayExists = selectedSetPlays.some(
                setPlay => setPlay._id.toString() === selectedSetPlayId
            );
            if (!selectedSetPlayExists) {
                throw new Error('Selected set play not found');
            }

            document.set(
                'setPlayList',
                selectedSetPlays.map(setPlay => {
                    if (setPlay._id.toString() !== selectedSetPlayId) {
                        return setPlay;
                    }
                    return {
                        ...setPlay,
                        setPlayId: setPlayData.setPlayId,
                        userData: setPlayData.userData
                    };
                })
            );
            return await document.saveSelectedSetPlay();
        } catch (error) {
            console.error('Error updating set play:', error);
            throw error;
        }
    }
);

setPlaysDataSchema.static(
    'removeSetPlay',
    async function removeSetPlay(
        startingLineupId: string,
        selectedSetPlayId: string
    ): Promise<SetPlaysDataSelectionReturnType[]> {
        try {
            const document = await this.findOne({ startingLineupId }).exec();
            if (!document) {
                throw new Error('No set plays for starting lineup');
            }

            const selectedSetPlays = document.toObject().setPlayList;
            const selectedSetPlayExists = selectedSetPlays.some(
                setPlay => setPlay._id.toString() === selectedSetPlayId
            );
            if (!selectedSetPlayExists) {
                throw new Error('Selected set play not found');
            }

            document.set(
                'setPlayList',
                selectedSetPlays.filter(
                    setPlay => setPlay._id.toString() !== selectedSetPlayId
                )
            );
            return await document.saveSelectedSetPlay();
        } catch (error) {
            console.error('Error removing set play:', error);
            throw error;
        }
    }
);

setPlaysDataSchema.static(
    'saveAdminSetPlay',
    async function saveAdminSetPlay(
        roundNumber: string,
        userId: string,
        setPlayData: SetPlayDataType[]
    ): Promise<void> {
        try {
            const round = Number(roundNumber);
            if (
                !Number.isInteger(round) ||
                round < MIN_REGULAR_SEASON_ROUND ||
                round > MAX_REGULAR_SEASON_ROUND
            ) {
                throw new Error(
                    `Invalid roundNumber: ${roundNumber}. Must be between ${MIN_REGULAR_SEASON_ROUND} and ${MAX_REGULAR_SEASON_ROUND}`
                );
            }

            const isValidUserId = await UserModel.exists({ _id: userId });
            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }
            if (!setPlayData.length) {
                return;
            }

            const startingLineupDocument =
                await StartingLineupModel.getUserStartingLineupByRound(
                    userId,
                    round
                );
            if (!startingLineupDocument) {
                throw new Error('No starting lineup for user and round');
            }

            const document = await this.findOne({
                startingLineupId: startingLineupDocument._id
            }).exec();
            if (!document) {
                throw new Error('No set plays for starting lineup');
            }

            const selectedSetPlays = document.toObject().setPlayList;
            for (const item of setPlayData) {
                const selectedSetPlayExists = selectedSetPlays.some(
                    setPlay => setPlay._id.toString() === item.selectedSetPlayId
                );
                if (!selectedSetPlayExists) {
                    throw new Error('Selected set play not found');
                }
            }

            document.set(
                'setPlayList',
                selectedSetPlays.map(setPlay => {
                    const item = setPlayData.find(
                        item => item.selectedSetPlayId === setPlay._id.toString()
                    );
                    if (!item || item.adminData === undefined) {
                        return setPlay;
                    }
                    return { ...setPlay, adminData: item.adminData };
                })
            );
            await document.save();
        } catch (error) {
            console.error('Error saving admin set plays:', error);
            throw error;
        }
    }
);

const SetPlaysDataModel = model<SetPlaysDataType, SetPlaysDataModelType>(
    'SetPlaysData',
    setPlaysDataSchema
);
export default SetPlaysDataModel;
