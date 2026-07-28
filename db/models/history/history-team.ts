import { model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    logoUrlSchema,
    nameSchema,
    objectIdSchema,
    teamNameSchema
} from '@/db/models/schema.types';

// HistoryTeam keeps a single team snapshot for a given history document (season context)
export const historyTeamZodSchema = z.object({
    historyId: objectIdSchema,
    name: teamNameSchema,
    coachName: nameSchema.optional(),
    logoUrl: logoUrlSchema
});

export type HistoryTeamType = z.infer<typeof historyTeamZodSchema>;

const historyTeamSchema = new Schema<HistoryTeamType>({
    historyId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    name: { type: String, required: true },
    coachName: { type: String },
    logoUrl: { type: String, required: true }
});

const HistoryTeamModel = model<HistoryTeamType>(
    'HistoryTeam',
    historyTeamSchema
);

export default HistoryTeamModel;
