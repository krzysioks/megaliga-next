import { isDeepStrictEqual } from 'node:util';

import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { MAX_SET_PLAYS_PER_ROUND } from '@/db/db.constants';
import { getSetPlayStartingLineup, normalizeSetPlayData } from '@/db/db.utils';
import StartingLineupModel, {
    type StartingLineupType
} from '@/db/models/games/starting-lineup';
import {
    attemptZodSchema,
    booleanDefaultFalseSchema,
    heatScoresSchema,
    numberSchema,
    objectIdSchema,
    SetPlayEnumType,
    uniquePlayerIdList
} from '@/db/models/schema.types';
import SetPlaysModel, { type SetPlaysType } from '@/db/models/set-plays';
import {
    getSelectedSetPlayIndex,
    validateSetPlays,
    validateSetPlayResults,
    validateSelectedSetPlay,
    validateSelectedSetPlayFields
} from '@/db/models/validation.utils';

const setPlayPayloadZodSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal(SetPlayEnumType.GwarancjaStartow),
        userData: z.object({ playerId: objectIdSchema }).required()
    }),
    z.object({
        type: z.literal(SetPlayEnumType.Remis),
        adminData: z.object({ playerIdList: uniquePlayerIdList }).optional()
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
                ids => ids.length === 4,
                'Four leaders are required'
            )
        }),
        adminData: z
            .object({
                leaders: z
                    .array(
                        z
                            .object({
                                playerId: objectIdSchema,
                                scoredMore: booleanDefaultFalseSchema
                            })
                            .required()
                    )
                    .length(4)
            })
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
export type SetPlayAdminInputType = NonNullable<
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

export type PopulatedFindType = HydratedDocument<PopulatedSetPlaysDataType>;

export type SetPlayDataType = {
    setPlayId: string;
    userData?: SetPlayUserInputType | null;
};

export type SetPlaysDataSelectionReturnType = SetPlayPayloadType & {
    name: string;
    setPlayId: string;
    selectedSetPlayId: string;
};
export type SetPlaysDataForUserReturnType = Pick<SetPlaysType, 'name'> & {
    userData: SetPlayUserDataType | null;
};
export type SetPlaysDataForAdminReturnType = Pick<SetPlaysType, 'name'> & {
    adminData: SetPlayAdminDataType | null;
};

export type SetPlaysDataListByStartingLineupIdReturnType = {
    setPlayList: SetPlaysDataSelectionReturnType[];
};

interface SetPlaysDataMethodsType {
    saveSelectedSetPlay: (
        startingLineupDocument: StartingLineupType,
        setPlayData: SetPlayDataType,
        selectedSetPlayId?: string
    ) => Promise<SetPlaysDataSelectionReturnType[]>;
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
    saveSetPlays: (
        startingLineupId: string,
        setPlayData: SetPlayDataType
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
    saveSetPlayResults: (
        startingLineupId: string,
        selectedSetPlayId: string,
        adminData: SetPlayAdminInputType
    ) => Promise<SetPlaysDataSelectionReturnType[]>;
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
        .toObject<PopulatedSetPlaysDataType>({ flattenObjectIds: true })
        .setPlayList.map(({ _id, setPlayId, ...play }) => {
            if (!setPlayId) {
                throw new Error('Missing catalog entry for selected set play');
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
            return {
                _id: plays[index].selectedSetPlayId,
                setPlayId: plays[index].setPlayId,
                ...('userData' in entry
                    ? { userData: normalizeSetPlayData(entry.userData) }
                    : {}),
                ...('adminData' in entry && entry.adminData !== undefined
                    ? { adminData: normalizeSetPlayData(entry.adminData) }
                    : {})
            };
        })
    );
});

setPlaysDataSchema.method(
    'saveSelectedSetPlay',
    async function saveSelectedSetPlay(
        startingLineupDocument: StartingLineupType,
        setPlayData: SetPlayDataType,
        selectedSetPlayId?: string
    ) {
        validateSelectedSetPlayFields(setPlayData);
        const setPlayId = objectIdSchema
            .unwrap()
            .parse(setPlayData.setPlayId)
            .toLowerCase();
        const setPlay = await SetPlaysModel.findById(setPlayId)
            .select('name type')
            .exec();
        if (!setPlay) {
            throw new Error(`Invalid setPlayId: ${setPlayId}`);
        }
        const entry = setPlayPayloadZodSchema.parse({
            type: setPlay.type,
            userData: setPlayData.userData
        });
        if ('userData' in entry) {
            entry.userData = normalizeSetPlayData(entry.userData);
        }

        const populated = await this.populate<PopulatedFindType>({
            path: 'setPlayList.setPlayId',
            select: 'name type'
        });
        const selectedSetPlayList = populated
            .toObject<PopulatedSetPlaysDataType>({ flattenObjectIds: true })
            .setPlayList.map(({ _id, setPlayId, ...play }) => {
                if (!setPlayId) {
                    throw new Error(
                        'Missing catalog entry for selected set play'
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
        const index =
            selectedSetPlayId === undefined
                ? selectedSetPlayList.length
                : getSelectedSetPlayIndex(
                      selectedSetPlayList,
                      selectedSetPlayId
                  );
        const previous = selectedSetPlayList[index];
        const samePlay = previous?.setPlayId === setPlayId;
        const unchanged =
            samePlay &&
            isDeepStrictEqual(
                'userData' in previous ? previous.userData : undefined,
                'userData' in entry ? entry.userData : undefined
            );
        selectedSetPlayList[index] = {
            ...entry,
            name: setPlay.name,
            setPlayId,
            selectedSetPlayId: samePlay
                ? previous.selectedSetPlayId
                : new Types.ObjectId().toString(),
            ...(unchanged &&
            'adminData' in previous &&
            previous.adminData !== undefined
                ? { adminData: previous.adminData }
                : {})
        } as SetPlaysDataSelectionReturnType;
        setPlayPayloadListZodSchema.parse(selectedSetPlayList);
        await validateSelectedSetPlay(startingLineupDocument, [entry]);

        this.depopulate('setPlayList.setPlayId');
        this.set(
            'setPlayList',
            selectedSetPlayList.map(play => {
                return {
                    _id: play.selectedSetPlayId,
                    setPlayId: play.setPlayId,
                    ...('userData' in play ? { userData: play.userData } : {}),
                    ...('adminData' in play && play.adminData !== undefined
                        ? { adminData: play.adminData }
                        : {})
                };
            })
        );
        await this.save();
        const savedDocument = await this.populate<PopulatedFindType>({
            path: 'setPlayList.setPlayId',
            select: 'name type'
        });
        return savedDocument
            .toObject<PopulatedSetPlaysDataType>({ flattenObjectIds: true })
            .setPlayList.map(({ _id, setPlayId, ...play }) => {
                if (!setPlayId) {
                    throw new Error(
                        'Missing catalog entry for selected set play'
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
    }
);

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
                    .select('setPlayList.setPlayId setPlayList.adminData')
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
                        adminData: setPlay.adminData ?? null
                    };
                });
        } catch (error) {
            console.error('Error fetching set plays for admin:', error);
            throw error;
        }
    }
);

setPlaysDataSchema.static(
    'saveSetPlays',
    async function saveSetPlays(
        startingLineupId: string,
        setPlayData: SetPlayDataType
    ) {
        try {
            const startingLineupDocument =
                await getSetPlayStartingLineup(startingLineupId);
            const document =
                (await this.findOne({
                    startingLineupId: startingLineupDocument._id
                }).exec()) ??
                new this({ startingLineupId: startingLineupDocument._id });
            return await document.saveSelectedSetPlay(
                startingLineupDocument,
                setPlayData
            );
        } catch (error) {
            console.error('Error saving set plays:', error);
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
    ) {
        try {
            const lineup = await getSetPlayStartingLineup(startingLineupId);
            const document = await this.findOne({
                startingLineupId: lineup._id
            }).exec();
            if (!document) {
                throw new Error('No set plays for starting lineup');
            }
            return await document.saveSelectedSetPlay(
                lineup,
                setPlayData,
                objectIdSchema.unwrap().parse(selectedSetPlayId)
            );
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
    ) {
        try {
            const lineup = await getSetPlayStartingLineup(startingLineupId);
            const document = await this.findOne({
                startingLineupId: lineup._id
            })
                .populate<PopulatedFindType>({
                    path: 'setPlayList.setPlayId',
                    select: 'name type'
                })
                .exec();
            if (!document) {
                throw new Error('No set plays for starting lineup');
            }
            const plays = document
                .toObject<PopulatedSetPlaysDataType>({ flattenObjectIds: true })
                .setPlayList.map(({ _id, setPlayId, ...play }) => {
                    if (!setPlayId) {
                        throw new Error(
                            'Missing catalog entry for selected set play'
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
            const index = getSelectedSetPlayIndex(plays, selectedSetPlayId);
            document.depopulate('setPlayList.setPlayId');
            document.set(
                'setPlayList',
                document
                    .toObject()
                    .setPlayList.filter((_, position) => position !== index)
            );
            await document.save();
            const savedDocument = await document.populate<PopulatedFindType>({
                path: 'setPlayList.setPlayId',
                select: 'name type'
            });
            return savedDocument
                .toObject<PopulatedSetPlaysDataType>({ flattenObjectIds: true })
                .setPlayList.map(({ _id, setPlayId, ...play }) => {
                    if (!setPlayId) {
                        throw new Error(
                            'Missing catalog entry for selected set play'
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
        } catch (error) {
            console.error('Error removing set play:', error);
            throw error;
        }
    }
);

setPlaysDataSchema.static(
    'saveSetPlayResults',
    async function saveSetPlayResults(
        startingLineupId: string,
        selectedSetPlayId: string,
        adminData: SetPlayAdminInputType
    ) {
        try {
            const lineup = await getSetPlayStartingLineup(startingLineupId);
            const document = await this.findOne({
                startingLineupId: lineup._id
            })
                .populate<PopulatedFindType>({
                    path: 'setPlayList.setPlayId',
                    select: 'name type'
                })
                .exec();
            if (!document) {
                throw new Error('No set plays for starting lineup');
            }
            const plays = document
                .toObject<PopulatedSetPlaysDataType>({ flattenObjectIds: true })
                .setPlayList.map(({ _id, setPlayId, ...play }) => {
                    if (!setPlayId) {
                        throw new Error(
                            'Missing catalog entry for selected set play'
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
            const index = getSelectedSetPlayIndex(plays, selectedSetPlayId);
            const schema = setPlayPayloadZodSchema.options.find(
                option => option.shape.type.value === plays[index].type
            );
            if (!schema) {
                throw new Error('Invalid set play type');
            }
            if (!('adminData' in schema.shape)) {
                throw new Error('This set play does not accept admin results');
            }
            if (
                adminData &&
                [
                    'setPlayId',
                    'selectedSetPlayId',
                    'name',
                    'type',
                    'userData'
                ].some(field => field in adminData)
            ) {
                throw new Error(
                    'Admin results cannot change the selected play'
                );
            }
            const resultSchema =
                schema.shape.adminData instanceof z.ZodDefault
                    ? schema.shape.adminData.removeDefault()
                    : schema.shape.adminData.unwrap();
            const results = normalizeSetPlayData(resultSchema.parse(adminData));
            await validateSetPlayResults(plays[index], results, lineup);
            document.get(`setPlayList.${index}`).set('adminData', results);
            await document.save();
            const savedDocument = await document.populate<PopulatedFindType>({
                path: 'setPlayList.setPlayId',
                select: 'name type'
            });
            return savedDocument
                .toObject<PopulatedSetPlaysDataType>({ flattenObjectIds: true })
                .setPlayList.map(({ _id, setPlayId, ...play }) => {
                    if (!setPlayId) {
                        throw new Error(
                            'Missing catalog entry for selected set play'
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
        } catch (error) {
            console.error('Error saving set play results:', error);
            throw error;
        }
    }
);

const SetPlaysDataModel = model<SetPlaysDataType, SetPlaysDataModelType>(
    'SetPlaysData',
    setPlaysDataSchema
);
export default SetPlaysDataModel;
