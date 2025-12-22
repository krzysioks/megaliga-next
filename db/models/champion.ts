import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';

//Champion is representation of megaliga_champion of old megaliga database

export const championZodSchema = z.object({
    userId: objectIdSchema
});

export type ChampionType = z.infer<typeof championZodSchema>;

const championSchema = new Schema<ChampionType>({
    userId: { type: Types.ObjectId, ref: 'User' }
});

// TODOKP: Need to implement static method to populate data from User model: logoUrl, teamName.

const ChampionModel = model<ChampionType>('Champion', championSchema);

export default ChampionModel;
