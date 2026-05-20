import { model, Schema } from 'mongoose';
import { z } from 'zod';

import { roundNumberSchema } from '@/db/models/schema.types';
import { validateDate } from '@/db/models/validation.utils';

//RoundCalendar is representation of megaliga_round_calendar of old megaliga database. Will be used for admin purposes (latest scores, new season form)

export const roundCalendarZodSchema = z.object({
    roundNumber: roundNumberSchema,
    roundDate: z.string().refine(validateDate, {
        message: 'Nieprawidłowy format daty. Użyj DD-MM-RRRR'
    })
});

export type RoundCalendarType = z.infer<typeof roundCalendarZodSchema>;

const roundCalendarSchema = new Schema<RoundCalendarType>({
    roundNumber: { type: Number, required: true },
    roundDate: { type: String, required: true }
});

const RoundCalendarModel = model<RoundCalendarType>(
    'RoundCalendar',
    roundCalendarSchema
);

export default RoundCalendarModel;
