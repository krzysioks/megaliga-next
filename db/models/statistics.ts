import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';

//Statistics collection keep statistics data for each player, where each document represent statistics for given season
// TODOKP there might be more statistics fields representing player performance in given season

export const statisticsZodSchema = z.object({
    season: objectIdSchema, // Reference to SeasonOps collection
    playerId: objectIdSchema,
    pointsPerLeg: z.number().min(0).default(0)
});

export type StatisticsType = z.infer<typeof statisticsZodSchema>;

const statisticsSchema = new Schema<StatisticsType>({
    season: { type: Types.ObjectId, ref: 'SeasonOps', required: true },
    playerId: { type: Types.ObjectId, ref: 'Players', required: true },
    pointsPerLeg: { type: Number, required: true, default: 0 }
});

const StatisticsModel = model<StatisticsType>('Statistics', statisticsSchema);

export default StatisticsModel;
