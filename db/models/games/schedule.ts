import { model, Schema, Types } from 'mongoose';
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
    userOneId: { type: Types.ObjectId, ref: 'User' },
    userTwoId: { type: Types.ObjectId, ref: 'User' },
    roundNumber: { type: Number, required: true },
    ligueGroupsId: { type: Types.ObjectId, ref: 'LigueGroups' },
    userOneScore: { type: Number },
    userTwoScore: { type: Number }
});

const ScheduleModel = model<ScheduleType>('Schedule', scheduleSchema);

export default ScheduleModel;
