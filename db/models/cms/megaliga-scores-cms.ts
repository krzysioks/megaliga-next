import { model, Model, Schema } from 'mongoose';
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

interface MegaligaScoresCmsModelType extends Model<MegaligaScoresCmsType> {
    getCmsBlockByRoundAndStage: (
        roundNumber: number,
        seasonStage: z.infer<typeof stageEnumSchema>
    ) => Promise<z.infer<typeof editorJsContentSchema>>;
}

const megaligaScoresCmsSchema = new Schema<
    MegaligaScoresCmsType,
    MegaligaScoresCmsModelType
>({
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

megaligaScoresCmsSchema.static(
    'getCmsBlockByRoundAndStage',
    async function getCmsBlockByRoundAndStage(
        roundNumber: number,
        seasonStage: (typeof STAGE_ENUM)[number]
    ) {
        try {
            const document = await this.findOne({
                roundNumber,
                seasonStage
            });

            if (!document) {
                throw new Error(
                    `Failed to fetch CMS block for megaliga scores round ${roundNumber} and stage ${seasonStage}:`
                );
            }

            return document.content;
        } catch (error) {
            console.error('Error:', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

const MegaligaScoresCmsModel = model<
    MegaligaScoresCmsType,
    MegaligaScoresCmsModelType
>('MegaligaScoresCms', megaligaScoresCmsSchema);

export default MegaligaScoresCmsModel;
