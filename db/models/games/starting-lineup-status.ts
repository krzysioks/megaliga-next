import { model, Schema } from 'mongoose';
import { z } from 'zod';

import { roundNumberSchema, stageEnumSchema } from '@/db/models/schema.types';

//StartingLineupStatus is representation of megaliga_starting_lineup_status of old megaliga database. Will be used for admins to lock/unlock starting lineup selection. For users will be used to define if starting lineup can be edited or not.

const STAGE_ENUM = stageEnumSchema._def.values;

export const startingLineupStatusZodSchema = z.object({
    roundNumber: roundNumberSchema,
    seasonStage: stageEnumSchema,
    isOpen: z.boolean()
});

export type StartingLineupStatusType = z.infer<
    typeof startingLineupStatusZodSchema
>;

const startingLineupStatusSchema = new Schema<StartingLineupStatusType>({
    roundNumber: { type: Number, required: true },
    seasonStage: {
        type: String,
        enum: STAGE_ENUM,
        required: true
    },
    isOpen: { type: Boolean, required: true }
});

const StartingLineupStatusModel = model<StartingLineupStatusType>(
    'StartingLineupStatus',
    startingLineupStatusSchema
);

export default StartingLineupStatusModel;
