import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';

//DraftOrderGabbana is representation of megaliga_season_draft_order_gabbana of old megaliga database. Will be used to render draft order in Trybuna view for Gabbana group

export const draftOrderGabbanaZodSchema = z.object({
    userId: objectIdSchema, // based on userId we will populate user.teamName (old team_names_id)
    draftOrder: z.number().min(0) // order of drafting in regular season draft for gabbana group
});

export type DraftOrderGabbanaType = z.infer<typeof draftOrderGabbanaZodSchema>;

const draftOrderGabbanaSchema = new Schema<DraftOrderGabbanaType>({
    userId: { type: Types.ObjectId, ref: 'User' },
    draftOrder: { type: Number, required: true }
});

const DraftOrderGabbanaModel = model<DraftOrderGabbanaType>(
    'DraftOrderGabbana',
    draftOrderGabbanaSchema
);

export default DraftOrderGabbanaModel;
