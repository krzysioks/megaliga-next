import { model, HydratedDocument, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import {
    draftNumberSchema,
    objectIdSchema,
    standardStringSchema,
    statusEnumSchema
} from '@/db/models/schema.types';
import UserModel from '@/db/models/user';

//Players is representation of megaliga_players of old megaliga database.

const PLAYER_ASSIGNMENT_TYPES = ['dolce', 'gabbana', 'playoff'] as const;
type PlayerAssignmentType = (typeof PLAYER_ASSIGNMENT_TYPES)[number];

const PLAYER_STATUS_ENUM = statusEnumSchema._def.values;

export const playersZodSchema = z.object({
    extraligaPlayerName: standardStringSchema,
    dolceUserId: objectIdSchema,
    gabbanaUserId: objectIdSchema,
    playoffUserId: objectIdSchema,
    draftedWithNumberDolce: draftNumberSchema,
    draftedWithNumberGabbana: draftNumberSchema,
    draftedWithNumberPlayoff: draftNumberSchema,
    playerStatus: statusEnumSchema.default('active'),
    statistics: objectIdSchema
});

export type PlayersType = z.infer<typeof playersZodSchema>;

interface PlayersMethodsType {
    draftPlayer: (userId: string, type: PlayerAssignmentType) => Promise<void>;
}

interface PlayersModelType extends Model<PlayersType, '', PlayersMethodsType> {
    getPlayersByUserId: (
        userId: string,
        type: PlayerAssignmentType
    ) => Promise<HydratedDocument<PlayersType>[]>;
    getAvailablePlayersByAssignmentType: (
        type: PlayerAssignmentType
    ) => Promise<HydratedDocument<PlayersType>[]>;
    resetPlayersAssignment: () => Promise<void>;
    importPlayers: (newPlayers: string) => Promise<void>;
}

const playersSchema = new Schema<
    PlayersType,
    PlayersModelType,
    PlayersMethodsType
>({
    extraligaPlayerName: { type: String, required: true },
    dolceUserId: { type: Types.ObjectId, ref: 'User' },
    gabbanaUserId: { type: Types.ObjectId, ref: 'User' },
    playoffUserId: { type: Types.ObjectId, ref: 'User' },
    draftedWithNumberDolce: { type: Number },
    draftedWithNumberGabbana: { type: Number },
    draftedWithNumberPlayoff: { type: Number },
    playerStatus: {
        type: String,
        enum: PLAYER_STATUS_ENUM,
        default: 'active'
    },
    statistics: { type: Types.ObjectId, ref: 'Statistics' }
});

playersSchema.static(
    'getPlayersByUserId',
    async function getPlayersByUserId(
        userId: string,
        type: PlayerAssignmentType
    ) {
        let idFieldName = '';
        switch (type) {
            case 'dolce':
                idFieldName = 'dolceUserId';
                break;
            case 'gabbana':
                idFieldName = 'gabbanaUserId';
                break;
            case 'playoff':
                idFieldName = 'playoffUserId';
                break;
            default:
                throw new Error('Invalid player assignment type');
        }

        try {
            return await this.find({
                [idFieldName]: userId
            });
        } catch (error) {
            console.error('Error fetching players:', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

playersSchema.static(
    'getAvailablePlayersByAssignmentType',
    async function getAvailablePlayersByAssignmentType(
        type: PlayerAssignmentType
    ) {
        let idFieldName = '';
        switch (type) {
            case 'dolce':
                idFieldName = 'dolceUserId';
                break;
            case 'gabbana':
                idFieldName = 'gabbanaUserId';
                break;
            case 'playoff':
                idFieldName = 'playoffUserId';
                break;
            default:
                throw new Error('Invalid player assignment type');
        }

        try {
            return await this.find({
                [idFieldName]: { $type: 'null' }
            });
        } catch (error) {
            console.error('Error fetching players:', error);
            // TODOKP: this error is thrown to be catched in higher level so that, front end can render error message to user.
            throw error;
        }
    }
);

playersSchema.static(
    'resetPlayersAssignment',
    async function resetPlayersAssignment() {
        try {
            await this.updateMany(
                {},
                {
                    $set: {
                        dolceUserId: null,
                        gabbanaUserId: null,
                        playoffUserId: null,
                        draftedWithNumberDolce: null,
                        draftedWithNumberGabbana: null,
                        draftedWithNumberPlayoff: null
                    }
                }
            );
        } catch (error) {
            console.error('Error resetting players assignment:', error);
            throw error;
        }
    }
);

playersSchema.static(
    'importPlayers',
    async function importPlayers(newPlayers: string) {
        try {
            const newPlayerNames = newPlayers
                .split(',')
                .map(name => {
                    return name.trim();
                })
                .filter(Boolean);

            const existingPlayers = await this.find(
                {},
                'extraligaPlayerName'
            ).exec();
            const existingPlayerNames = existingPlayers.map(player => {
                return player.extraligaPlayerName;
            });

            const playerNamesToAdd = newPlayerNames.filter(name => {
                return !existingPlayerNames.includes(name);
            });

            if (playerNamesToAdd.length) {
                await this.create(
                    playerNamesToAdd.map(name => {
                        return {
                            extraligaPlayerName: name,
                            playerStatus: 'active'
                        };
                    })
                );
            }

            const playerNamesToDeactivate = existingPlayerNames.filter(name => {
                return !newPlayerNames.includes(name);
            });

            if (playerNamesToDeactivate.length) {
                await this.updateMany(
                    { extraligaPlayerName: { $in: playerNamesToDeactivate } },
                    { $set: { playerStatus: 'inactive' } }
                );
            }
        } catch (error) {
            console.error('Error importing players:', error);
            throw error;
        }
    }
);

playersSchema.method(
    'draftPlayer',
    async function draftPlayer(userId: string, type: PlayerAssignmentType) {
        try {
            if (!PLAYER_ASSIGNMENT_TYPES.includes(type)) {
                throw new Error('Invalid player assignment type');
            }

            const isValidUserId = await UserModel.exists({ _id: userId });
            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }

            let idFieldName = '';
            switch (type) {
                case 'dolce':
                    idFieldName = 'dolceUserId';
                    break;
                case 'gabbana':
                    idFieldName = 'gabbanaUserId';
                    break;
                case 'playoff':
                    idFieldName = 'playoffUserId';
                    break;
                default:
                    throw new Error('Invalid player assignment type');
            }

            this.set(idFieldName, userId);
            await this.save();
        } catch (error) {
            console.error('Error updating player:', error);
            throw error;
        }
    }
);

const PlayersModel = model<PlayersType, PlayersModelType>(
    'Players',
    playersSchema
);

export default PlayersModel;
