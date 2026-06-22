import { HydratedDocument, model, Model, Schema } from 'mongoose';
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

interface RoundCalendarModelType extends Model<RoundCalendarType> {
    getRoundDates: () => Promise<HydratedDocument<RoundCalendarType>[]>;
    setRoundDates: (roundCalendarData: RoundCalendarType[]) => Promise<void>;
}

const roundCalendarSchema = new Schema<
    RoundCalendarType,
    RoundCalendarModelType
>({
    roundNumber: { type: Number, required: true },
    roundDate: { type: String, required: true }
});

roundCalendarSchema.static('getRoundDates', async function getRoundDates() {
    try {
        return await this.find({});
    } catch (error) {
        console.error('Error fetching dates for rounds:', error);
        // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
        throw error;
    }
});

roundCalendarSchema.static(
    'setRoundDates',
    async function setRoundDates(roundCalendarData: RoundCalendarType[]) {
        try {
            if (!roundCalendarData.length) {
                throw new Error('No round dates provided for setting.');
            }

            const bulkOps = roundCalendarData.map(
                ({ roundDate, roundNumber }) => {
                    if (!validateDate(roundDate)) {
                        throw new Error(
                            `Invalid date format for round ${roundNumber}: ${roundDate}. Expected format is DD-MM-RRRR.`
                        );
                    }

                    return {
                        updateOne: {
                            filter: { roundNumber },
                            update: { $set: { roundDate } },
                            upsert: true
                        }
                    };
                }
            );

            await this.bulkWrite(bulkOps);
        } catch (error) {
            console.error('Error setting dates for rounds:', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

const RoundCalendarModel = model<RoundCalendarType, RoundCalendarModelType>(
    'RoundCalendar',
    roundCalendarSchema
);

// TODOKP: 1. static function getRoundDates() -> to return array of documents with roundNumber and roundDate
// TODOKP: 2. static function setRoundDates(dates: RoundCalendarType[]) -> to set round dates it will take array of objects with roundNumber and roundDate and will update existing documents or create new ones if they don't exist. Filter will be roundNumber

export default RoundCalendarModel;
