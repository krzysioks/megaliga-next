import { isDeepStrictEqual } from 'node:util';

import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import {
    getSelectedSetPlays,
    getSetPlaySelections,
    normalizeSetPlayData
} from '@/db/db.utils';
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
    getSetPlayIndex,
    getSetPlayLineup,
    validateSetPlays,
    validateSetPlayResults,
    validateSetPlaySelections,
    validateSetPlaySelectionFields
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

const resolvedSetPlayListSchema = setPlayPayloadZodSchema
    .array()
    .max(6)
    .superRefine(validateSetPlays);

export type ResolvedSetPlayType = z.infer<typeof setPlayPayloadZodSchema>;
export type SetPlayUserDataType = Extract<
    ResolvedSetPlayType,
    { userData: unknown }
>['userData'];
export type SetPlayAdminDataType = NonNullable<
    Extract<ResolvedSetPlayType, { adminData?: unknown }>['adminData']
>;
export type SetPlayAdminInputType = NonNullable<
    Extract<
        z.input<typeof setPlayPayloadZodSchema>,
        { adminData?: unknown }
    >['adminData']
>;
export type SetPlaySelectionType = {
    setPlayId: string;
    playId?: string;
    userData?:
        | Extract<
              z.input<typeof setPlayPayloadZodSchema>,
              { userData: unknown }
          >['userData']
        | Record<string, never>;
};
export type SetPlayUpdateType = Omit<SetPlaySelectionType, 'playId'>;
export type SelectedSetPlayType = ResolvedSetPlayType & {
    name: string;
    setPlayId: string;
    playId: string;
};
export type SetPlaysDataDocumentType = {
    startingLineupId: Types.ObjectId;
    setPlayList: {
        _id: Types.ObjectId;
        setPlayId: Types.ObjectId;
        userData?: SetPlayUserDataType;
        adminData?: SetPlayAdminDataType;
    }[];
};
export type PopulatedSetPlaysDataType = Omit<
    SetPlaysDataDocumentType,
    'setPlayList'
> & {
    setPlayList: (Omit<
        SetPlaysDataDocumentType['setPlayList'][number],
        'setPlayId'
    > & {
        setPlayId: (SetPlaysType & { _id: Types.ObjectId }) | null;
    })[];
};
export type PopulatedFindType =
    HydratedDocument<PopulatedSetPlaysDataType> | null;
export type SetPlayForUserReturnType = Pick<SetPlaysType, 'name'> & {
    userData: SetPlayUserDataType | Record<string, never>;
};
export type SetPlayForAdminReturnType = Pick<SetPlaysType, 'name'> & {
    adminData: SetPlayAdminDataType | Record<string, never>;
};

interface SetPlaysDataMethodsType {
    saveSelections: (
        lineup: StartingLineupType,
        selections: SetPlaySelectionType[]
    ) => Promise<SelectedSetPlayType[]>;
}

interface SetPlaysDataModelType extends Model<
    SetPlaysDataDocumentType,
    '',
    SetPlaysDataMethodsType
> {
    getSetPlaysForUser: (
        startingLineupId: string
    ) => Promise<SetPlayForUserReturnType[]>;
    getSetPlaysForAdmin: (
        roundNumber: number,
        userId: string
    ) => Promise<SetPlayForAdminReturnType[]>;
    saveSetPlays: (
        startingLineupId: string,
        selections: SetPlaySelectionType[]
    ) => Promise<SelectedSetPlayType[]>;
    updateSetPlay: (
        startingLineupId: string,
        playId: string,
        selection: SetPlayUpdateType
    ) => Promise<SelectedSetPlayType[]>;
    removeSetPlay: (
        startingLineupId: string,
        playId: string
    ) => Promise<SelectedSetPlayType[]>;
    saveSetPlayResults: (
        startingLineupId: string,
        playId: string,
        adminData: SetPlayAdminInputType
    ) => Promise<SelectedSetPlayType[]>;
}

const setPlayListSchema = new Schema({
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
    SetPlaysDataDocumentType,
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
    const plays = await getSelectedSetPlays(this);
    const entries = resolvedSetPlayListSchema.parse(plays);
    this.depopulate('setPlayList.setPlayId');
    this.set(
        'setPlayList',
        entries.map((entry, index) => {
            return {
                _id: plays[index].playId,
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
    'saveSelections',
    async function saveSelections(
        lineup: StartingLineupType,
        input: SetPlaySelectionType[]
    ) {
        input.forEach(selection => {
            validateSetPlaySelectionFields(selection);
        });
        const setPlayIdList = input.map(selection => {
            return objectIdSchema
                .unwrap()
                .parse(selection.setPlayId)
                .toLowerCase();
        });
        const catalog = await SetPlaysModel.find({
            _id: { $in: setPlayIdList }
        })
            .select('name type')
            .exec();
        const catalogById = new Map(
            catalog.map(play => [play._id.toString(), play])
        );
        const entries = resolvedSetPlayListSchema.parse(
            input.map((selection, index) => {
                const catalogPlay = catalogById.get(setPlayIdList[index]);
                if (!catalogPlay) {
                    throw new Error(
                        `Invalid setPlayId: ${setPlayIdList[index]}`
                    );
                }
                return { type: catalogPlay.type, userData: selection.userData };
            })
        );
        const selections = entries.map((entry, index) => {
            if ('userData' in entry) {
                entry.userData = normalizeSetPlayData(entry.userData);
            }
            return {
                ...entry,
                setPlayId: setPlayIdList[index],
                ...(input[index].playId !== undefined
                    ? {
                          playId: objectIdSchema
                              .unwrap()
                              .parse(input[index].playId)
                              .toLowerCase()
                      }
                    : {})
            };
        });
        const existing = new Map(
            (await getSelectedSetPlays(this)).map(play => [play.playId, play])
        );
        const identities = new Set<string>();
        for (const selection of selections) {
            if (selection.playId && identities.has(selection.playId)) {
                throw new Error('Duplicate playId');
            }
            if (selection.playId) {
                identities.add(selection.playId);
            }
            if (selection.playId && !existing.has(selection.playId)) {
                throw new Error(
                    `Invalid playId for starting lineup: ${selection.playId}`
                );
            }
        }
        await validateSetPlaySelections(lineup, selections);
        const plays = selections.map(selection => {
            const previous = selection.playId
                ? existing.get(selection.playId)
                : undefined;
            const samePlay = previous?.setPlayId === selection.setPlayId;
            const unchanged =
                samePlay &&
                isDeepStrictEqual(
                    'userData' in previous ? previous.userData : undefined,
                    'userData' in selection ? selection.userData : undefined
                );
            return {
                setPlayId: selection.setPlayId,
                ...('userData' in selection
                    ? { userData: selection.userData }
                    : {}),
                ...(samePlay ? { _id: previous.playId } : {}),
                ...(unchanged &&
                'adminData' in previous &&
                previous.adminData !== undefined
                    ? { adminData: previous.adminData }
                    : {})
            };
        });
        this.depopulate('setPlayList.setPlayId');
        this.set('setPlayList', plays);
        await this.save();
        return getSelectedSetPlays(this);
    }
);

// on dashboard view we will know userId and roundNumber, so we will be able to get startingLineupId, that should be passed to this function. During implementation of UI we can decide to change attributes of this function
setPlaysDataSchema.static(
    'getSetPlaysForUser',
    async function getSetPlaysForUser(
        startingLineupId: string
    ): Promise<SetPlayForUserReturnType[]> {
        try {
            const setPlayDocument: PopulatedFindType = await this.findOne({
                startingLineupId
            })
                .select('setPlayList.setPlayId setPlayList.userData')
                .populate<Pick<PopulatedSetPlaysDataType, 'setPlayList'>>({
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
                        userData: setPlay.userData ?? {}
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
    ): Promise<SetPlayForAdminReturnType[]> {
        try {
            const startingLineupDocument =
                await StartingLineupModel.getUserStartingLineupByRound(
                    userId,
                    roundNumber
                );
            if (!startingLineupDocument) {
                return [];
            }

            const setPlayDocument: PopulatedFindType = await this.findOne({
                startingLineupId: startingLineupDocument._id
            })
                .select('setPlayList.setPlayId setPlayList.adminData')
                .populate<Pick<PopulatedSetPlaysDataType, 'setPlayList'>>({
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
                        adminData: setPlay.adminData ?? {}
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
        selections: SetPlaySelectionType[]
    ) {
        try {
            const lineup = await getSetPlayLineup(startingLineupId);
            const document =
                (await this.findOne({ startingLineupId: lineup._id }).exec()) ??
                new this({ startingLineupId: lineup._id });
            return await document.saveSelections(lineup, selections);
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
        playId: string,
        input: SetPlayUpdateType
    ) {
        try {
            const lineup = await getSetPlayLineup(startingLineupId);
            const document = await this.findOne({
                startingLineupId: lineup._id
            }).exec();
            if (!document) {
                throw new Error('No set plays for starting lineup');
            }
            const plays = await getSelectedSetPlays(document);
            const index = getSetPlayIndex(plays, playId);
            validateSetPlaySelectionFields(input, false);
            const selections = getSetPlaySelections(plays);
            selections[index] = { ...input, playId: plays[index].playId };
            return await document.saveSelections(lineup, selections);
        } catch (error) {
            console.error('Error updating set play:', error);
            throw error;
        }
    }
);

setPlaysDataSchema.static(
    'removeSetPlay',
    async function removeSetPlay(startingLineupId: string, playId: string) {
        try {
            const lineup = await getSetPlayLineup(startingLineupId);
            const document = await this.findOne({
                startingLineupId: lineup._id
            }).exec();
            if (!document) {
                throw new Error('No set plays for starting lineup');
            }
            const index = getSetPlayIndex(
                await getSelectedSetPlays(document),
                playId
            );
            document.depopulate('setPlayList.setPlayId');
            document.set(
                'setPlayList',
                document
                    .toObject()
                    .setPlayList.filter((_, position) => position !== index)
            );
            await document.save();
            return getSelectedSetPlays(document);
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
        playId: string,
        adminData: SetPlayAdminInputType
    ) {
        try {
            const lineup = await getSetPlayLineup(startingLineupId);
            const document = await this.findOne({
                startingLineupId: lineup._id
            }).exec();
            if (!document) {
                throw new Error('No set plays for starting lineup');
            }
            const plays = await getSelectedSetPlays(document);
            const index = getSetPlayIndex(plays, playId);
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
                ['setPlayId', 'playId', 'name', 'type', 'userData'].some(
                    field => field in adminData
                )
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
            return getSelectedSetPlays(document);
        } catch (error) {
            console.error('Error saving set play results:', error);
            throw error;
        }
    }
);

const SetPlaysDataModel = model<
    SetPlaysDataDocumentType,
    SetPlaysDataModelType
>('SetPlaysData', setPlaysDataSchema);
export default SetPlaysDataModel;
