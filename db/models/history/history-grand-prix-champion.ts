import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';

//HistoryGrandPrixChampion is representation of megaliga_grandprix_champion_history of old megaliga database. It is used to show Hall of Grand Prix Fame section in Trybuna view

export const historyGrandPrixChampionZodSchema = z.object({
    season: objectIdSchema,
    teamId: objectIdSchema
});

export type HistoryGrandPrixChampionType = z.infer<
    typeof historyGrandPrixChampionZodSchema
>;

const historyGrandPrixChampionSchema = new Schema<HistoryGrandPrixChampionType>(
    {
        season: {
            type: Schema.Types.ObjectId,
            ref: 'SeasonOps',
            required: true
        },
        teamId: { type: Types.ObjectId, ref: 'History', required: true }
    }
);

// TODOKP: Need to implement static method to populate data from User model: coachName.

const HistoryGrandPrixChampionModel = model<HistoryGrandPrixChampionType>(
    'HistoryGrandPrixChampion',
    historyGrandPrixChampionSchema
);

export default HistoryGrandPrixChampionModel;
