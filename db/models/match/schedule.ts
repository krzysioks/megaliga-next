import { model, Schema } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema, roundNumberSchema } from '@/db/models/schema.types';

//Schedule is representation of megaliga_schedule of old megaliga database. Will be used for displaying results of latest round in Trybuna and Wyniki view. id_rematch_schedule fields are not migrated, as there is no more rule to add extra point for winning rematch.

export const scheduleZodSchema = z.object({
    userOneId: objectIdSchema,
    userTwoId: objectIdSchema,
    roundNumber: roundNumberSchema,
    ligueGroupsId: objectIdSchema,
    userOneScore: z.number().min(0).optional(),
    userTwoScore: z.number().min(0).optional()
});

export type ScheduleType = z.infer<typeof scheduleZodSchema>;

const scheduleSchema = new Schema<ScheduleType>({
    userOneId: { type: String, required: true },
    userTwoId: { type: String, required: true },
    ligueGroupsId: { type: String, required: true },
    userOneScore: { type: Number },
    userTwoScore: { type: Number },
    roundNumber: { type: Number, required: true }
});

const ScheduleModel = model<ScheduleType>('Schedule', scheduleSchema);

export default ScheduleModel;
