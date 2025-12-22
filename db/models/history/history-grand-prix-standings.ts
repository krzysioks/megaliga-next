import { model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    objectIdSchema,
    standingsGrandPrixSchema
} from '@/db/models/schema.types';

//HistoryGrandPrixStandings collection in each document represents standings of Grand Prix for given season in megaliga history
export const historyGrandPrixStandingsZodSchema = z.object({
    season: objectIdSchema, // Reference to SeasonOps collection
    standings: z.array(standingsGrandPrixSchema)
});

export type HistoryGrandPrixStandingsType = z.infer<
    typeof historyGrandPrixStandingsZodSchema
>;

const historyGrandPrixStandingsSchema =
    new Schema<HistoryGrandPrixStandingsType>({
        season: {
            type: Schema.Types.ObjectId,
            ref: 'SeasonOps',
            required: true
        },
        standings: [
            {
                place: { type: Number, required: true },
                teamId: {
                    type: Schema.Types.ObjectId,
                    ref: 'History',
                    required: true
                },
                played: { type: Number, required: true },
                points: { type: Number, required: true }
            }
        ]
    });

// TODOKP: Need to implement static method to populate data from History.teams: coachName.

const HistoryGrandPrixStandingsModel = model<HistoryGrandPrixStandingsType>(
    'HistoryGrandPrixStandings',
    historyGrandPrixStandingsSchema
);

export default HistoryGrandPrixStandingsModel;
