import { model, Schema } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema, standingPlayinSchema } from '@/db/models/schema.types';

//HistoryPlayinStandings collection represent in each document standings of playin season for given season in megaliga history
export const historyPlayinStandingsZodSchema = z.object({
    season: objectIdSchema, // Reference to SeasonOps collection
    standings: z.array(standingPlayinSchema)
});

export type HistoryPlayinStandingsType = z.infer<
    typeof historyPlayinStandingsZodSchema
>;

const historyPlayinStandingsSchema = new Schema<HistoryPlayinStandingsType>({
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
            wins: { type: Number, required: true },
            draw: { type: Number, required: true },
            defeat: { type: Number, required: true },
            balance: { type: Number, required: true },
            points: { type: Number, required: true }
        }
    ]
});

const HistoryPlayinStandingsModel = model<HistoryPlayinStandingsType>(
    'HistoryPlayinStandings',
    historyPlayinStandingsSchema
);

export default HistoryPlayinStandingsModel;
