import { model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    objectIdSchema,
    historyStandingSchema
} from '@/db/models/schema.types';

//HistoryRegularSeasonStandings collection represent in each document standings of regular season for given season in megaliga history
export const historyRegularSeasonStandingsZodSchema = z.object({
    season: objectIdSchema, // Reference to SeasonOps collection
    standings: z.array(historyStandingSchema)
});

export type HistoryRegularSeasonStandingsType = z.infer<
    typeof historyRegularSeasonStandingsZodSchema
>;

const historyRegularSeasonStandingsSchema =
    new Schema<HistoryRegularSeasonStandingsType>({
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
                points: { type: Number, required: true },
                ligueGroup: { type: String, required: true }
            }
        ]
    });

const HistoryRegularSeasonStandingsModel =
    model<HistoryRegularSeasonStandingsType>(
        'HistoryRegularSeasonStandings',
        historyRegularSeasonStandingsSchema
    );

export default HistoryRegularSeasonStandingsModel;
