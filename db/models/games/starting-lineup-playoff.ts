import type { PlayerPositionsAndRolesType } from '@/db/models/schema.types';

import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { MIN_PLAYOFF_ROUND, MAX_PLAYOFF_ROUND } from '@/db/db.constants';
import {
    objectIdSchema,
    playerPositionsZodSchema,
    playerPositionsAndRolesZodSchema,
    playerRolesZodSchema,
    roundNumberSchema
} from '@/db/models/schema.types';
import UserModel from '@/db/models/user';

//StartingLineupPlayoff is representation of megaliga_starting_lineup_playoff of old megaliga database. Will be used for displaying selected starting lineup for given match. Used in dashboard in form to select lineup before match.

export const startingLineupPlayoffZodSchema = playerPositionsZodSchema.extend({
    userId: objectIdSchema, //Reference to User model, to know to whom this lineup belongs
    roundNumber: roundNumberSchema,
    roles: playerRolesZodSchema
});

export type StartingLineupPlayoffType = z.infer<
    typeof startingLineupPlayoffZodSchema
>;

export type StartingLineupPlayoffPrimusNominatusForAdminReturnType =
    StartingLineupPlayoffType['roles']['pn'];

interface StartingLineupPlayoffMethodsType {
    updatePlayersPosition: (data: PlayerPositionsAndRolesType) => Promise<void>;
}

const PLAYER_POSITION_KEYS = [
    ...Object.keys(playerPositionsAndRolesZodSchema.shape)
] as (keyof PlayerPositionsAndRolesType)[];

type StartingLineupPlayoffDocumentType = Promise<
    HydratedDocument<StartingLineupPlayoffType, StartingLineupPlayoffMethodsType>
>;

export interface StartingLineupPlayoffPlayersByRoundReturnType {
    userId: string[];
    startingLineupId: string[];
    playerId: string;
    playerName: string;
}

type PopulatedPlayerType = {
    _id: Types.ObjectId;
    extraligaPlayerName: string;
};

type PopulatedStartingLineupPlayoffType = Omit<
    StartingLineupPlayoffType,
    'playerOne' | 'playerTwo' | 'playerThree' | 'playerFour' | 'playerFive'
> & {
    playerOne: PopulatedPlayerType;
    playerTwo: PopulatedPlayerType;
    playerThree: PopulatedPlayerType;
    playerFour: PopulatedPlayerType;
    playerFive: PopulatedPlayerType;
};

export type PopulatedFindType =
    HydratedDocument<PopulatedStartingLineupPlayoffType>;

interface StartingLineupPlayoffModelType extends Model<
    StartingLineupPlayoffType,
    '',
    StartingLineupPlayoffMethodsType
> {
    getPrimusNominatusForAdmin: (
        roundNumber: number,
        userId: string
    ) => Promise<StartingLineupPlayoffPrimusNominatusForAdminReturnType | null>;
    savePrimusNominatusForAdmin: (
        roundNumber: number,
        userId: string,
        isDisabled: boolean
    ) => Promise<void>;
    getUserStartingLineupByRound: (
        userId: string,
        roundNumber: number
    ) => StartingLineupPlayoffDocumentType;
    setPlayersPosition: (
        data: PlayerPositionsAndRolesType,
        userId: string,
        roundNumber: number
    ) => Promise<void>;
    deleteAll: () => Promise<void>;
    getStartingLineupPlayersByRound: (
        roundNumber: number
    ) => Promise<StartingLineupPlayoffPlayersByRoundReturnType[]>;
}

const startingLineupPlayoffSchema = new Schema<
    StartingLineupPlayoffType,
    StartingLineupPlayoffModelType,
    StartingLineupPlayoffMethodsType
>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roundNumber: { type: Number, required: true },
    playerOne: { type: Schema.Types.ObjectId, ref: 'Players', required: true },
    playerTwo: { type: Schema.Types.ObjectId, ref: 'Players', required: true },
    playerThree: {
        type: Schema.Types.ObjectId,
        ref: 'Players',
        required: true
    },
    playerFour: { type: Schema.Types.ObjectId, ref: 'Players', required: true },
    playerFive: { type: Schema.Types.ObjectId, ref: 'Players', required: true },
    roles: {
        pn: {
            playerId: { type: Schema.Types.ObjectId, ref: 'Players', required: true },
            isDisabled: { type: Boolean, default: false }
        },
        kb: { type: Schema.Types.ObjectId, ref: 'Players', required: true },
        p: { type: Schema.Types.ObjectId, ref: 'Players', required: true }
    }
});

startingLineupPlayoffSchema.static(
    'getPrimusNominatusForAdmin',
    async function getPrimusNominatusForAdmin(
        roundNumber: number,
        userId: string
    ): Promise<StartingLineupPlayoffPrimusNominatusForAdminReturnType | null> {
        try {
            if (
                roundNumber < MIN_PLAYOFF_ROUND ||
                roundNumber > MAX_PLAYOFF_ROUND
            ) {
                throw new Error(
                    `Invalid roundNumber: ${roundNumber}. Must be between ${MIN_PLAYOFF_ROUND} and ${MAX_PLAYOFF_ROUND}`
                );
            }
            const isValidUserId = await UserModel.exists({ _id: userId });
            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }

            const startingLineupDocument = await this.findOne({
                userId,
                roundNumber
            }).exec();
            if (!startingLineupDocument) {
                return null;
            }

            return {
                playerId: startingLineupDocument.roles.pn.playerId.toString(),
                isDisabled: startingLineupDocument.roles.pn.isDisabled
            };
        } catch (error) {
            console.error(
                'Error fetching playoff Primus Nominatus admin data:',
                error
            );
            throw error;
        }
    }
);

startingLineupPlayoffSchema.static(
    'savePrimusNominatusForAdmin',
    async function savePrimusNominatusForAdmin(
        roundNumber: number,
        userId: string,
        isDisabled: boolean
    ): Promise<void> {
        try {
            if (
                roundNumber < MIN_PLAYOFF_ROUND ||
                roundNumber > MAX_PLAYOFF_ROUND
            ) {
                throw new Error(
                    `Invalid roundNumber: ${roundNumber}. Must be between ${MIN_PLAYOFF_ROUND} and ${MAX_PLAYOFF_ROUND}`
                );
            }
            const isValidUserId = await UserModel.exists({ _id: userId });
            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }
            const validatedIsDisabled = z.boolean().parse(isDisabled);
            const startingLineupDocument = await this.findOne({
                userId,
                roundNumber
            }).exec();
            if (!startingLineupDocument) {
                throw new Error('No starting lineup for user and round');
            }
            startingLineupDocument.set(
                'roles.pn.isDisabled',
                validatedIsDisabled
            );
            await startingLineupDocument.save();
        } catch (error) {
            console.error(
                'Error saving playoff Primus Nominatus admin data:',
                error
            );
            throw error;
        }
    }
);

startingLineupPlayoffSchema.static(
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
            console.error('Error fetching playoff starting lineup:', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

startingLineupPlayoffSchema.static(
    'setPlayersPosition',
    async function setPlayersPosition(
        data: PlayerPositionsAndRolesType,
        userId: string,
        roundNumber: number
    ) {
        try {
            const hasOnlyAllowedKeys = Object.keys(data).every(key => {
                return PLAYER_POSITION_KEYS.includes(
                    key as keyof PlayerPositionsAndRolesType
                );
            });
            if (!hasOnlyAllowedKeys) {
                throw new Error(
                    'Invalid positions payload. Allowed fields: playerOne, playerTwo, playerThree, playerFour, playerFive, roles.'
                );
            }

            playerPositionsAndRolesZodSchema.parse(data);

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
                    `Playoff starting lineup already exists for userId: ${userId} and roundNumber: ${roundNumber}`
                );
            }

            await new StartingLineupPlayoffModel({
                userId,
                roundNumber,
                ...data,
                roles: {
                    ...data.roles,
                    pn: { playerId: data.roles.pn.playerId, isDisabled: false }
                }
            }).save();
        } catch (error) {
            console.error('Error updating playoff starting lineup:', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

startingLineupPlayoffSchema.method(
    'updatePlayersPosition',
    async function updatePlayersPosition(data: PlayerPositionsAndRolesType) {
        try {
            const hasOnlyAllowedKeys = Object.keys(data).every(key => {
                return PLAYER_POSITION_KEYS.includes(
                    key as keyof PlayerPositionsAndRolesType
                );
            });

            if (!hasOnlyAllowedKeys) {
                throw new Error(
                    'Invalid positions payload. Allowed fields: playerOne, playerTwo, playerThree, playerFour, playerFive, roles.'
                );
            }

            playerPositionsAndRolesZodSchema.parse(data);

            this.set({
                ...data,
                roles: {
                    ...data.roles,
                    pn: {
                        playerId: data.roles.pn.playerId,
                        isDisabled: this.roles.pn.isDisabled
                    }
                }
            });
            await this.save();
        } catch (error) {
            console.error('Error updating playoff starting lineup:', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

startingLineupPlayoffSchema.static('deleteAll', async function deleteAll() {
    try {
        await this.deleteMany({});
    } catch (error) {
        console.error('Error deleting all playoff starting lineups:', error);
        throw error;
    }
});

startingLineupPlayoffSchema.static(
    'getStartingLineupPlayersByRound',
    async function getStartingLineupPlayersByRound(roundNumber: number) {
        try {
            const startingLineups = await this.find({ roundNumber })
                .populate<PopulatedFindType>({
                    path: 'playerOne playerTwo playerThree playerFour playerFive',
                    select: '_id extraligaPlayerName'
                })
                .exec();

            if (startingLineups.length < 4) {
                throw new Error(
                    `Expected 4 starting lineups for round ${roundNumber}, but found ${startingLineups.length}.`
                );
            }

            const playersByPlayerId = startingLineups.reduce<
                Map<string, StartingLineupPlayoffPlayersByRoundReturnType>
            >((accumulator, lineup) => {
                const userId = lineup.userId?.toString() ?? '';
                const startingLineupId = lineup._id.toString();
                const players = [
                    lineup.playerOne,
                    lineup.playerTwo,
                    lineup.playerThree,
                    lineup.playerFour,
                    lineup.playerFive
                ];

                players.forEach(player => {
                    const playerId = player._id.toString();
                    const existingEntry = accumulator.get(playerId);

                    if (existingEntry) {
                        existingEntry.userId.push(userId);
                        existingEntry.startingLineupId.push(startingLineupId);
                        return;
                    }

                    accumulator.set(playerId, {
                        userId: [userId],
                        startingLineupId: [startingLineupId],
                        playerId,
                        playerName: player.extraligaPlayerName
                    });
                });

                return accumulator;
            }, new Map());

            return Array.from(playersByPlayerId.values());
        } catch (error) {
            console.error(
                `Error while getting playoff starting lineup players by round: ${roundNumber}`,
                error
            );
            throw error;
        }
    }
);

const StartingLineupPlayoffModel = model<
    StartingLineupPlayoffType,
    StartingLineupPlayoffModelType
>('StartingLineupPlayoff', startingLineupPlayoffSchema);

export default StartingLineupPlayoffModel;
