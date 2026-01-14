import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';

//DraftOrderPlayoff is representation of megaliga_playoff_draft_order of old megaliga database. Will be used to render playoff draft order in Trybuna view

export const draftOrderPlayoffZodSchema = z.object({
    userId: objectIdSchema, // based on userId we will populate user.teamName (old team_names_id)
    draftOrder: z.number().min(0) // order of drafting in playoff draft
});

export type DraftOrderPlayoffType = z.infer<typeof draftOrderPlayoffZodSchema>;

const draftOrderPlayoffSchema = new Schema<DraftOrderPlayoffType>({
    userId: { type: Types.ObjectId, ref: 'User' },
    draftOrder: { type: Number, required: true }
});

const DraftOrderPlayoffModel = model<DraftOrderPlayoffType>(
    'DraftOrderPlayoff',
    draftOrderPlayoffSchema
);

export default DraftOrderPlayoffModel;
