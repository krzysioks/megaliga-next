import { model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    editorJsContentSchema,
    roundNumberSchema,
    stageEnumSchema
} from '@/db/models/schema.types';

//MegaligaScoresCms is collection that stores cms content of cms block in "wyniki" view

const STAGE_ENUM = stageEnumSchema._def.values;

export const megaligaScoresCmsZodSchema = z.object({
    roundNumber: roundNumberSchema,
    seasonStage: stageEnumSchema,
    content: editorJsContentSchema
});

export type MegaligaScoresCmsType = z.infer<typeof megaligaScoresCmsZodSchema>;

const megaligaScoresCmsSchema = new Schema<MegaligaScoresCmsType>({
    roundNumber: { type: Number, required: true },
    seasonStage: {
        type: String,
        enum: STAGE_ENUM,
        required: true
    },
    content: {
        type: Schema.Types.Mixed,
        required: true,
        validate: {
            validator: (value: unknown) =>
                editorJsContentSchema.safeParse(value).success,
            message: 'Invalid Editor.js content'
        }
    }
});

const MegaligaScoresCmsModel = model<MegaligaScoresCmsType>(
    'MegaligaScoresCms',
    megaligaScoresCmsSchema
);

export default MegaligaScoresCmsModel;
