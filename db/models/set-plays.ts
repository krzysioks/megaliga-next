import { model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import {
    SetPlayEnumType,
    standardStringSchema
} from '@/db/models/schema.types';

export const setPlaysZodSchema = z.object({
    name: standardStringSchema,
    type: z.nativeEnum(SetPlayEnumType)
});

export type SetPlaysType = z.infer<typeof setPlaysZodSchema>;

export type SetPlaysReturnType = SetPlaysType & {
    id: Types.ObjectId;
};

interface SetPlaysModelType extends Model<SetPlaysType> {
    getSetPlays: () => Promise<SetPlaysReturnType[]>;
}

const setPlaysSchema = new Schema<SetPlaysType, SetPlaysModelType>({
    name: { type: String, required: true, maxlength: 255 },
    type: { type: String, required: true, enum: Object.values(SetPlayEnumType) }
});

setPlaysSchema.static('getSetPlays', async function getSetPlays() {
    try {
        const documents = await this.find().exec();

        if (!documents.length) {
            throw new Error('No set plays found');
        }

        return documents.map(document => {
            return {
                id: document._id,
                name: document.name,
                type: document.type
            };
        });
    } catch (error) {
        console.error('Error fetching set plays:', error);
        throw error;
    }
});

const SetPlaysModel = model<SetPlaysType, SetPlaysModelType>(
    'SetPlays',
    setPlaysSchema
);
export default SetPlaysModel;
