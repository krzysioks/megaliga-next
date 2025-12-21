import { model, Schema } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema, standingSchema } from '@/db/models/schema.types';

//HistoryRegularSeason collection represent in each document standings of regular season for given season in megaliga history
export const historyRegularSeasonZodSchema = z.object({
    season: objectIdSchema.optional(), // Reference to SeasonOps collection
    standings: z.array(standingSchema)
});

export type HistoryRegularSeasonType = z.infer<
    typeof historyRegularSeasonZodSchema
>;

const historyRegularSeasonSchema = new Schema<HistoryRegularSeasonType>({
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
            },
            played: { type: Number, required: true },
            wins: { type: Number, required: true },
            draw: { type: Number, required: true },
            defeat: { type: Number, required: true },
            balance: { type: Number, required: true },
            points: { type: Number, required: true },
            ligueGroup: { type: String, required: true }
        }
    ]
});

const HistoryRegularSeasonModel = model<HistoryRegularSeasonType>(
    'HistoryRegularSeason',
    historyRegularSeasonSchema
);

export default HistoryRegularSeasonModel;
