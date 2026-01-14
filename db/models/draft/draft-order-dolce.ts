import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';

//DraftOrderDolce is representation of megaliga_season_draft_order_dolce of old megaliga database. Will be used to render draft order in Trybuna view for Dolce group

export const draftOrderDolceZodSchema = z.object({
    userId: objectIdSchema, // based on userId we will populate user.teamName (old team_names_id)
    draftOrder: z.number().min(0) // order of drafting in regular season draft for dolce group
});

export type DraftOrderDolceType = z.infer<typeof draftOrderDolceZodSchema>;

const draftOrderDolceSchema = new Schema<DraftOrderDolceType>({
    userId: { type: Types.ObjectId, ref: 'User' },
    draftOrder: { type: Number, required: true }
});

const DraftOrderDolceModel = model<DraftOrderDolceType>(
    'DraftOrderDolce',
    draftOrderDolceSchema
);

export default DraftOrderDolceModel;
