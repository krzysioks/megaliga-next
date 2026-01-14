import { model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    objectIdSchema,
    roundNumberSchema,
    standardStringSchema
} from '@/db/models/schema.types';

//StartingLineupPlayoff is representation of megaliga_starting_lineup_playoff of old megaliga database. Will be used for displaying selected starting lineup for given match. Used in dashboard in form to select lineup before match. Also will be used in ScoreDetailsPlayoff model to populate setplays

export const startingLineupPlayoffZodSchema = z.object({
    userId: objectIdSchema, //Reference to User model, to know to whom this lineup belongs
    roundNumber: roundNumberSchema,
    setPlays: standardStringSchema.optional(), //TODOKP: for now it will be string, until business logic for setplays will be defined
    playerOne: z.number(),
    playerTwo: z.number(),
    playerThree: z.number(),
    playerFour: z.number(),
    playerFive: z.number()
});

export type StartingLineupPlayoffType = z.infer<
    typeof startingLineupPlayoffZodSchema
>;

const startingLineupPlayoffSchema = new Schema<StartingLineupPlayoffType>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roundNumber: { type: Number, required: true },
    setPlays: { type: String },
    playerOne: { type: Number, required: true },
    playerTwo: { type: Number, required: true },
    playerThree: { type: Number, required: true },
    playerFour: { type: Number, required: true },
    playerFive: { type: Number, required: true }
});

const StartingLineupPlayoffModel = model<StartingLineupPlayoffType>(
    'StartingLineupPlayoff',
    startingLineupPlayoffSchema
);

export default StartingLineupPlayoffModel;
