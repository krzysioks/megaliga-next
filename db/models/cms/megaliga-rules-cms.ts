import { model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import { editorJsContentSchema } from '@/db/models/schema.types';

//MegaligaRulesCms is one document collection that stores 'zasady' cms page

export const megaligaRulesCmsZodSchema = z.object({
    content: editorJsContentSchema
});

export type MegaligaRulesCmsType = z.infer<typeof megaligaRulesCmsZodSchema>;

interface MegaligaRulesCmsModelType extends Model<MegaligaRulesCmsType> {
    setRulesCmsContent: (
        content: z.infer<typeof editorJsContentSchema>
    ) => Promise<void>;
}

const megaligaRulesCmsSchema = new Schema<
    MegaligaRulesCmsType,
    MegaligaRulesCmsModelType
>({
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

megaligaRulesCmsSchema.static(
    'setRulesCmsContent',
    async function setRulesCmsContent(
        content: z.infer<typeof editorJsContentSchema>
    ) {
        try {
            await this.findOneAndUpdate(
                {},
                { $set: { content } },
                { upsert: true, runValidators: true }
            );
        } catch (error) {
            console.error('Error setting rules CMS content:', error);
            throw error;
        }
    }
);

const megaligaRulesCmsModel = model<
    MegaligaRulesCmsType,
    MegaligaRulesCmsModelType
>('MegaligaRulesCms', megaligaRulesCmsSchema);

export default megaligaRulesCmsModel;
