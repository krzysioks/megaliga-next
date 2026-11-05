import { z } from 'zod';

import {
    MAX_SET_PLAYS_PER_ROUND,
    STARTING_LINEUP_PLAYER_COUNT,
    BRUDNA_PALA_LEADER_COUNT
} from '@/db/db.constants';
import {
    attemptZodSchema,
    booleanDefaultFalseSchema,
    playerScoresZodSchema,
    numberSchema,
    objectIdSchema,
    SetPlayEnumType,
    uniquePlayerIdList
} from '@/db/models/schema.types';
import { validateSetPlays } from '@/db/models/validation.utils';

export const setPlayPayloadZodSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal(SetPlayEnumType.GwarancjaStartow),
        userData: z.object({ playerId: objectIdSchema }).required()
    }),
    z.object({
        type: z.literal(SetPlayEnumType.Remis),
        adminData: z
            .record(objectIdSchema.unwrap(), z.boolean())
            .refine(results => {
                return (
                    Object.keys(results).length === STARTING_LINEUP_PLAYER_COUNT
                );
            }, 'Remis requires five player results')
            .optional()
    }),
    z.object({
        type: z.literal(SetPlayEnumType.Rezerwa),
        userData: z.object({ playerId: objectIdSchema }).required(),
        adminData: playerScoresZodSchema.default({})
    }),
    z.object({
        type: z.literal(SetPlayEnumType.RezerwaGielda),
        userData: z.object({ playerId: objectIdSchema }).required(),
        adminData: playerScoresZodSchema.default({})
    }),
    z.object({
        type: z.literal(SetPlayEnumType.MortalKombatCombo)
    }),
    z.object({
        type: z.literal(SetPlayEnumType.Muchomor)
    }),
    z.object({
        type: z.literal(SetPlayEnumType.Ncd),
        userData: z.object({ playerId: objectIdSchema }).required(),
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
        userData: z.object({ playerId: objectIdSchema }).required(),
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
            .object({
                isDisabled: booleanDefaultFalseSchema,
                playerResults: z
                    .record(objectIdSchema.unwrap(), z.boolean())
                    .refine(results => {
                        return (
                            Object.keys(results).length ===
                            BRUDNA_PALA_LEADER_COUNT
                        );
                    }, 'BrudnaPala requires four player results')
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
        userData: z
            .object({
                playerId: objectIdSchema,
                replacedPlayerId: objectIdSchema
            })
            .required(),
        adminData: playerScoresZodSchema
            .extend({
                isMatchDraw: booleanDefaultFalseSchema,
                average: numberSchema.optional(),
                isDisabled: booleanDefaultFalseSchema
            })
            .default({})
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

export const setPlayPayloadListZodSchema = setPlayPayloadZodSchema
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

export type SetPlayDataType = {
    setPlayId: string;
    selectedSetPlayId?: string;
    userData?: SetPlayUserInputType | null;
    adminData?: SetPlayAdminInputType;
};
