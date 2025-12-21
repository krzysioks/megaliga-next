import { model, Schema } from 'mongoose';
import { z } from 'zod';

import { booleanDefaultFalseSchema } from '@/db/models/schema.types';

//SeasonOps is representation of megaliga_season of old megaliga database

export const seasonOpsZodSchema = z.object({
    name: z.string().length(4),
    isCurrentSeason: booleanDefaultFalseSchema,
    numberOfGroups: z.number().min(1).max(2),
    showGroupNames: booleanDefaultFalseSchema
});

export type SeasonOpsType = z.infer<typeof seasonOpsZodSchema>;

const seasonOpsSchema = new Schema<SeasonOpsType>({
    name: { type: String, required: true, unique: true },
    isCurrentSeason: { type: Boolean, default: false },
    numberOfGroups: { type: Number, required: true },
    showGroupNames: { type: Boolean, default: false }
});

const SeasonOpsModel = model<SeasonOpsType>('SeasonOps', seasonOpsSchema);

export default SeasonOpsModel;
