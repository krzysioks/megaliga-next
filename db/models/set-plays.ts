import { model, Schema } from 'mongoose';
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

const setPlaysSchema = new Schema<SetPlaysType>({
    name: { type: String, required: true, maxlength: 255 },
    type: { type: String, required: true, enum: Object.values(SetPlayEnumType) }
});

setPlaysSchema.pre('validate', function validateSetPlays() {
    setPlaysZodSchema.parse(this.toObject());
});

// The existing selections already occupy Mongoose's default "setplays" collection.
const SetPlaysModel = model<SetPlaysType>(
    'SetPlays',
    setPlaysSchema,
    'setplayscatalog'
);
export default SetPlaysModel;
