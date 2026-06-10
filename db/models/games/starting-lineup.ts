import { HydratedDocument, model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    objectIdSchema,
    roundNumberSchema,
    standardStringSchema
} from '@/db/models/schema.types';
import UserModel from '@/db/models/user';

//StartingLineup is representation of megaliga_starting_lineup of old megaliga database. Will be used for displaying selected starting lineup for given match. Used in dashboard in form to select lineup before match. Also will be used in ScoreDetails model to populate setplays

export const startingLineupZodSchema = z.object({
    userId: objectIdSchema, //Reference to User model, to know to whom this lineup belongs
    roundNumber: roundNumberSchema,
    setPlays: standardStringSchema.optional(), //TODOKP: for now it will be string, until business logic for setplays will be defined
    playerOne: objectIdSchema,
    playerTwo: objectIdSchema,
    playerThree: objectIdSchema,
    playerFour: objectIdSchema,
    playerFive: objectIdSchema
});

export type StartingLineupType = z.infer<typeof startingLineupZodSchema>;

const playerPositionsZodSchema = startingLineupZodSchema.omit({
    userId: true,
    roundNumber: true,
    setPlays: true
});

export type PlayerPostions = Required<z.infer<typeof playerPositionsZodSchema>>;

interface StartingLineupMethodsType {
    updatePlayersPosition: (positions: PlayerPostions) => Promise<void>;
}

const PLAYER_POSITION_KEYS = [
    ...Object.keys(playerPositionsZodSchema.shape)
] as (keyof PlayerPostions)[];

type StartingLineupDocumentType = Promise<HydratedDocument<StartingLineupType>>;

interface StartingLineupModelType extends Model<
    StartingLineupType,
    '',
    StartingLineupMethodsType
> {
    getUserStartingLineupByRound: (
        userId: string,
        roundNumber: number
    ) => StartingLineupDocumentType;
    setPlayersPosition: (
        positions: PlayerPostions,
        userId: string,
        roundNumber: number
    ) => Promise<void>;
}

const startingLineupSchema = new Schema<
    StartingLineupType,
    StartingLineupModelType,
    StartingLineupMethodsType
>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roundNumber: { type: Number, required: true },
    setPlays: { type: String },
    playerOne: { type: Schema.Types.ObjectId, ref: 'Players', required: true },
    playerTwo: { type: Schema.Types.ObjectId, ref: 'Players', required: true },
    playerThree: {
        type: Schema.Types.ObjectId,
        ref: 'Players',
        required: true
    },
    playerFour: { type: Schema.Types.ObjectId, ref: 'Players', required: true },
    playerFive: { type: Schema.Types.ObjectId, ref: 'Players', required: true }
});

startingLineupSchema.static(
    'getUserStartingLineupByRound',
    async function getUserStartingLineupByRound(
        userId: string,
        roundNumber: number
    ) {
        try {
            return await this.findOne({
                userId,
                roundNumber
            });
        } catch (error) {
            console.error('Error fetching starting lineup:', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

startingLineupSchema.static(
    'setPlayersPosition',
    async function setPlayersPosition(
        positions: PlayerPostions,
        userId: string,
        roundNumber: number
    ) {
        try {
            const hasOnlyAllowedKeys = Object.keys(positions).every(key =>
                PLAYER_POSITION_KEYS.includes(key as keyof PlayerPostions)
            );
            if (!hasOnlyAllowedKeys) {
                throw new Error(
                    'Invalid positions payload. Allowed fields: playerOne, playerTwo, playerThree, playerFour, playerFive.'
                );
            }

            const isValidUserId = await UserModel.exists({ _id: userId });
            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }

            const existingLineup = await this.findOne({
                userId,
                roundNumber
            });

            if (existingLineup) {
                throw new Error(
                    `Starting lineup already exists for userId: ${userId} and roundNumber: ${roundNumber}`
                );
            }

            await new StartingLineupModel({
                userId,
                roundNumber,
                ...positions
            }).save();
        } catch (error) {
            console.error('Error updating starting lineup:', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

startingLineupSchema.method(
    'updatePlayersPosition',
    async function updatePlayersPosition(positions: PlayerPostions) {
        try {
            const hasOnlyAllowedKeys = Object.keys(positions).every(key =>
                PLAYER_POSITION_KEYS.includes(key as keyof PlayerPostions)
            );

            if (!hasOnlyAllowedKeys) {
                throw new Error(
                    'Invalid positions payload. Allowed fields: playerOne, playerTwo, playerThree, playerFour, playerFive.'
                );
            }

            this.set(positions);
            await this.save();
        } catch (error) {
            console.error('Error updating starting lineup:', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

const StartingLineupModel = model<StartingLineupType, StartingLineupModelType>(
    'StartingLineup',
    startingLineupSchema
);

export default StartingLineupModel;
