import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';

//ChampionGrandPrix is representation of megaliga_grand_prix_champion of old megaliga database. It is used to show current Grand Prix Champion in Trybuna view

export const championGrandPrixZodSchema = z.object({
    userId: objectIdSchema
});

export type ChampionGrandPrixType = z.infer<typeof championGrandPrixZodSchema>;

const championGrandPrixSchema = new Schema<ChampionGrandPrixType>({
    userId: { type: Types.ObjectId, ref: 'User' }
});

// TODOKP: Need to implement static method to populate data from User model: coachName.

const ChampionGrandPrixModel = model<ChampionGrandPrixType>(
    'ChampionGrandPrix',
    championGrandPrixSchema
);

export default ChampionGrandPrixModel;
