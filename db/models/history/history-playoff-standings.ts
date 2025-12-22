import { model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    objectIdSchema,
    standingPlayoffSchema
} from '@/db/models/schema.types';

//HistoryPlayoffStandings collection in each document represents standings of playoffs for given season in megaliga history
export const historyPlayoffStandingsZodSchema = z.object({
    season: objectIdSchema.optional(), // Reference to SeasonOps collection
    standings: z.array(standingPlayoffSchema)
});

export type HistoryPlayoffStandingsType = z.infer<
    typeof historyPlayoffStandingsZodSchema
>;

const historyPlayoffStandingsSchema = new Schema<HistoryPlayoffStandingsType>({
    season: {
        type: Schema.Types.ObjectId,
        ref: 'SeasonOps'
    },
    standings: [
        {
            place: { type: Number, required: true },
            teamId: {
                type: Schema.Types.ObjectId,
                ref: 'History',
                required: true
            }
        }
    ]
});

const HistoryPlayoffStandingsModel = model<HistoryPlayoffStandingsType>(
    'HistoryPlayoffStandings',
    historyPlayoffStandingsSchema
);

export default HistoryPlayoffStandingsModel;
