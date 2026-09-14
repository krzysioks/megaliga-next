import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
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

export interface StartingLineupPlayersByRoundReturnType {
    playerId: string;
    playerName: string;
}

type PopulatedPlayerType = {
    _id: Types.ObjectId;
    extraligaPlayerName: string;
};

type PopulatedStartingLineupType = Omit<
    StartingLineupType,
    'playerOne' | 'playerTwo' | 'playerThree' | 'playerFour' | 'playerFive'
> & {
    playerOne: PopulatedPlayerType;
    playerTwo: PopulatedPlayerType;
    playerThree: PopulatedPlayerType;
    playerFour: PopulatedPlayerType;
    playerFive: PopulatedPlayerType;
};

export type PopulatedFindType = HydratedDocument<PopulatedStartingLineupType>;

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
    deleteAll: () => Promise<void>;
    getStartingLineupPlayersByRound: (
        roundNumber: number
    ) => Promise<StartingLineupPlayersByRoundReturnType[]>;
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

startingLineupSchema.static('deleteAll', async function deleteAll() {
    try {
        await this.deleteMany({});
    } catch (error) {
        console.error('Error deleting all starting lineups:', error);
        throw error;
    }
});

startingLineupSchema.static(
    'getStartingLineupPlayersByRound',
    async function getStartingLineupPlayersByRound(roundNumber: number) {
        try {
            const startingLineups = await this.find({ roundNumber })
                .populate<PopulatedFindType>({
                    path: 'playerOne playerTwo playerThree playerFour playerFive',
                    select: '_id extraligaPlayerName'
                })
                .exec();

            if (startingLineups.length < 12) {
                throw new Error(
                    `Expected 12 starting lineups for round ${roundNumber}, but found ${startingLineups.length}.`
                );
            }

            return startingLineups.reduce<
                StartingLineupPlayersByRoundReturnType[]
            >((startingPlayersList, lineup) => {
                return [
                    ...startingPlayersList,
                    {
                        playerId: lineup.playerOne._id.toString(),
                        playerName: lineup.playerOne.extraligaPlayerName
                    },
                    {
                        playerId: lineup.playerTwo._id.toString(),
                        playerName: lineup.playerTwo.extraligaPlayerName
                    },
                    {
                        playerId: lineup.playerThree._id.toString(),
                        playerName: lineup.playerThree.extraligaPlayerName
                    },
                    {
                        playerId: lineup.playerFour._id.toString(),
                        playerName: lineup.playerFour.extraligaPlayerName
                    },
                    {
                        playerId: lineup.playerFive._id.toString(),
                        playerName: lineup.playerFive.extraligaPlayerName
                    }
                ];
            }, []);
        } catch (error) {
            console.error(
                `Error while getting starting lineup players by round: ${roundNumber}`,
                error
            );
            throw error;
        }
    }
);

const StartingLineupModel = model<StartingLineupType, StartingLineupModelType>(
    'StartingLineup',
    startingLineupSchema
);

export default StartingLineupModel;
