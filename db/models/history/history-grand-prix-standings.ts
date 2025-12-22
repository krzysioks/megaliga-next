import { model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    objectIdSchema,
    standingsGrandPrixSchema
} from '@/db/models/schema.types';

//HistoryGrandPrixStandings collection in each document represents standings of Grand Prix for given season in megaliga history
// miejsce	trener	rozegrane GP	pkt
export const historyGrandPrixStandingsZodSchema = z.object({
    season: objectIdSchema.optional(), // Reference to SeasonOps collection
    standings: z.array(standingsGrandPrixSchema)
});

export type HistoryGrandPrixStandingsType = z.infer<
    typeof historyGrandPrixStandingsZodSchema
>;

const historyGrandPrixStandingsSchema =
    new Schema<HistoryGrandPrixStandingsType>({
        season: {
            type: Schema.Types.ObjectId,
            ref: 'SeasonOps'
        },
        standings: [
            {
                place: { type: Number, required: true },
                coachName: { type: String, required: true },
                played: { type: Number, required: true },
                points: { type: Number, required: true }
            }
        ]
    });

const HistoryGrandPrixStandingsModel = model<HistoryGrandPrixStandingsType>(
    'HistoryGrandPrixStandings',
    historyGrandPrixStandingsSchema
);

export default HistoryGrandPrixStandingsModel;
