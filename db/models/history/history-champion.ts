import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';

//HistoryChampion is representation of megaliga_history_champion of old megaliga database. It is used to show Hall of Fame section in Trybuna view

export const historyChampionZodSchema = z.object({
    season: objectIdSchema,
    teamId: objectIdSchema
});

export type HistoryChampionType = z.infer<typeof historyChampionZodSchema>;

const historyChampionSchema = new Schema<HistoryChampionType>({
    season: {
        type: Schema.Types.ObjectId,
        ref: 'SeasonOps',
        required: true
    },
    teamId: { type: Types.ObjectId, ref: 'History', required: true }
});

// TODOKP: Need to implement static method to populate data from History.teams: logoUrl, teamName.

const HistoryChampionModel = model<HistoryChampionType>(
    'HistoryChampion',
    historyChampionSchema
);

export default HistoryChampionModel;
