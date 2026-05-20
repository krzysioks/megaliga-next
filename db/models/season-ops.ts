import { model, Schema } from 'mongoose';
import { z } from 'zod';

import { booleanDefaultFalseSchema } from '@/db/models/schema.types';

//SeasonOps is representation of megaliga_season of old megaliga database

export const seasonOpsZodSchema = z.object({
    name: z.string().length(4),
    isCurrentSeason: booleanDefaultFalseSchema,
    numberOfGroups: z.number().min(1).max(2),
    showGroupNames: booleanDefaultFalseSchema,
    isScoreCalculatded: z.object({
        // defines if given round has scores calculated by admin
        1: booleanDefaultFalseSchema,
        2: booleanDefaultFalseSchema,
        3: booleanDefaultFalseSchema,
        4: booleanDefaultFalseSchema,
        5: booleanDefaultFalseSchema,
        6: booleanDefaultFalseSchema,
        7: booleanDefaultFalseSchema,
        8: booleanDefaultFalseSchema,
        9: booleanDefaultFalseSchema,
        10: booleanDefaultFalseSchema,
        11: booleanDefaultFalseSchema,
        12: booleanDefaultFalseSchema,
        13: booleanDefaultFalseSchema,
        14: booleanDefaultFalseSchema
    }),
    isScoreCalculatdedPlayoff: z.object({
        // defines if given playoff round has scores calculated by admin
        1: booleanDefaultFalseSchema,
        2: booleanDefaultFalseSchema,
        3: booleanDefaultFalseSchema,
        4: booleanDefaultFalseSchema
    })
});

export type SeasonOpsType = z.infer<typeof seasonOpsZodSchema>;

const seasonOpsSchema = new Schema<SeasonOpsType>({
    name: { type: String, required: true, unique: true },
    isCurrentSeason: { type: Boolean, default: false },
    numberOfGroups: { type: Number, required: true },
    showGroupNames: { type: Boolean, default: false },
    isScoreCalculatded: {
        1: { type: Boolean, default: false },
        2: { type: Boolean, default: false },
        3: { type: Boolean, default: false },
        4: { type: Boolean, default: false },
        5: { type: Boolean, default: false },
        6: { type: Boolean, default: false },
        7: { type: Boolean, default: false },
        8: { type: Boolean, default: false },
        9: { type: Boolean, default: false },
        10: { type: Boolean, default: false },
        11: { type: Boolean, default: false },
        12: { type: Boolean, default: false },
        13: { type: Boolean, default: false },
        14: { type: Boolean, default: false }
    },
    isScoreCalculatdedPlayoff: {
        1: { type: Boolean, default: false },
        2: { type: Boolean, default: false },
        3: { type: Boolean, default: false },
        4: { type: Boolean, default: false }
    }
});

const SeasonOpsModel = model<SeasonOpsType>('SeasonOps', seasonOpsSchema);

export default SeasonOpsModel;
