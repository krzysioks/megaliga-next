import { model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    objectIdSchema,
    booleanDefaultFalseSchema
} from '@/db/models/schema.types';

//DraftOrder is representation of megaliga_draft_order of old megaliga database

export const draftOrderZodSchema = z.object({
    ligueGropusId: objectIdSchema, //field will be used to know to which document save selected position by user. Either to dolce or gabbana
    spot: z.object({
        positionNo: z.number().min(1).max(6),
        isSelected: booleanDefaultFalseSchema
    })
});

export type DraftOrderType = z.infer<typeof draftOrderZodSchema>;

const draftOrderSchema = new Schema<DraftOrderType>({
    ligueGropusId: { type: String, required: true },
    spot: {
        positionNo: { type: Number, required: true },
        isSelected: { type: Boolean, default: false }
    }
});

const DraftOrderModel = model<DraftOrderType>('Champion', draftOrderSchema);

export default DraftOrderModel;
