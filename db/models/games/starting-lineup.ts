import { model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    objectIdSchema,
    roundNumberSchema,
    standardStringSchema
} from '@/db/models/schema.types';

//StartingLineup is representation of megaliga_starting_lineup of old megaliga database. Will be used for displaying selected starting lineup for given match. Used in dashboard in form to select lineup before match. Also will be used in ScoreDetails model to populate setplays

export const startingLineupZodSchema = z.object({
    userId: objectIdSchema, //Reference to User model, to know to whom this lineup belongs
    roundNumber: roundNumberSchema,
    setPlays: standardStringSchema.optional(), //TODOKP: for now it will be string, until business logic for setplays will be defined
    playerOne: z.number(),
    playerTwo: z.number(),
    playerThree: z.number(),
    playerFour: z.number(),
    playerFive: z.number()
});

export type StartingLineupType = z.infer<typeof startingLineupZodSchema>;

const startingLineupSchema = new Schema<StartingLineupType>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roundNumber: { type: Number, required: true },
    setPlays: { type: String },
    playerOne: { type: Number, required: true },
    playerTwo: { type: Number, required: true },
    playerThree: { type: Number, required: true },
    playerFour: { type: Number, required: true },
    playerFive: { type: Number, required: true }
});

const StartingLineupModel = model<StartingLineupType>(
    'StartingLineup',
    startingLineupSchema
);

export default StartingLineupModel;
