import { model, Schema } from 'mongoose';
import { z } from 'zod';

import { standingSchema } from '@/db/models/schema.types';

//Standings collection represent regular season standings for current season of megaliga
export const StandingsZodSchema = z.object({
    standings: z.array(standingSchema)
});

export type StandingsType = z.infer<typeof StandingsZodSchema>;

const StandingsSchema = new Schema<StandingsType>({
    standings: [
        {
            place: { type: Number, required: true },
            userId: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            played: { type: Number, required: true },
            wins: { type: Number, required: true },
            draw: { type: Number, required: true },
            defeat: { type: Number, required: true },
            balance: { type: Number, required: true },
            points: { type: Number, required: true },
            ligueGroup: { type: String, required: true }
        }
    ]
});

const StandingsModel = model<StandingsType>('Standings', StandingsSchema);

export default StandingsModel;
