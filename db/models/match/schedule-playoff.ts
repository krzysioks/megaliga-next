import { model, Schema } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema, roundNumberSchema } from '@/db/models/schema.types';

//SchedulePlayoff is representation of megaliga_schedule_playoff of old megaliga database. Will be used for displaying playoff standings view and in wyniki view.

const STAGE_ENUM = ['3rdplace', 'semifinal', 'final'] as const;

export const schedulePlayoffZodSchema = z.object({
    userOneId: objectIdSchema,
    userTwoId: objectIdSchema,
    roundNumber: roundNumberSchema,
    userOneScore: z.number().min(0).optional(),
    userTwoScore: z.number().min(0).optional(),
    userOneSeed: z.number().min(1).max(4),
    userTwoSeed: z.number().min(1).max(4),
    stage: z.enum(STAGE_ENUM)
});

export type SchedulePlayoffType = z.infer<typeof schedulePlayoffZodSchema>;

const schedulePlayoffSchema = new Schema<SchedulePlayoffType>({
    userOneId: { type: String, required: true },
    userTwoId: { type: String, required: true },
    roundNumber: { type: Number, required: true },
    userOneScore: { type: Number },
    userTwoScore: { type: Number },
    userOneSeed: { type: Number, required: true },
    userTwoSeed: { type: Number, required: true },
    stage: {
        type: String,
        required: true,
        enum: STAGE_ENUM
    }
});

const SchedulePlayoffModel = model<SchedulePlayoffType>(
    'SchedulePlayoff',
    schedulePlayoffSchema
);

export default SchedulePlayoffModel;
