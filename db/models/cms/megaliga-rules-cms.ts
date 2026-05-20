import { model, Schema } from 'mongoose';
import { z } from 'zod';

import { editorJsContentSchema } from '@/db/models/schema.types';

//MegaligaRulesCms is one document collection that stores 'zasady' cms page

export const megaligaRulesCmsZodSchema = z.object({
    content: editorJsContentSchema
});

export type MegaligaRulesCmsType = z.infer<typeof megaligaRulesCmsZodSchema>;

const megaligaRulesCmsSchema = new Schema<MegaligaRulesCmsType>({
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

const megaligaRulesCmsModel = model<MegaligaRulesCmsType>(
    'MegaligaRulesCms',
    megaligaRulesCmsSchema
);

export default megaligaRulesCmsModel;
