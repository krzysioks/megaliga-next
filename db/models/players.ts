import { model, Model, Schema, Types } from 'mongoose';
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
    isJunior: z.boolean().default(false),
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

export type PlayersReturnType = PlayersType & { playerId: string };

export type PlayersImportType = Pick<
    PlayersType,
    'extraligaPlayerName' | 'isJunior'
>;

interface PlayersMethodsType {
    draftPlayer: (userId: string, type: PlayerAssignmentType) => Promise<void>;
}

interface PlayersModelType extends Model<PlayersType, '', PlayersMethodsType> {
    getPlayersByUserId: (
        userId: string,
        type: PlayerAssignmentType
    ) => Promise<PlayersReturnType[]>;
    getAvailablePlayersByAssignmentType: (
        type: PlayerAssignmentType
    ) => Promise<PlayersReturnType[]>;
    resetPlayersAssignment: () => Promise<void>;
    parsePlayers: (newPlayers: string) => PlayersImportType[];
    importPlayers: (newPlayers: PlayersImportType[]) => Promise<void>;
}

const playersSchema = new Schema<
    PlayersType,
    PlayersModelType,
    PlayersMethodsType
>({
    extraligaPlayerName: { type: String, required: true },
    isJunior: { type: Boolean, default: false },
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
            const playerDocuments = await this.find({
                [idFieldName]: userId
            }).exec();

            return playerDocuments.map(playerDocument => {
                return {
                    playerId: playerDocument._id.toString(),
                    extraligaPlayerName: playerDocument.extraligaPlayerName,
                    isJunior: playerDocument.isJunior,
                    dolceUserId: playerDocument.dolceUserId,
                    gabbanaUserId: playerDocument.gabbanaUserId,
                    playoffUserId: playerDocument.playoffUserId,
                    draftedWithNumberDolce:
                        playerDocument.draftedWithNumberDolce,
                    draftedWithNumberGabbana:
                        playerDocument.draftedWithNumberGabbana,
                    draftedWithNumberPlayoff:
                        playerDocument.draftedWithNumberPlayoff,
                    playerStatus: playerDocument.playerStatus,
                    statistics: playerDocument.statistics
                };
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
            const playerDocuments = await this.find({
                [idFieldName]: { $type: 'null' }
            }).exec();

            return playerDocuments.map(playerDocument => {
                return {
                    playerId: playerDocument._id.toString(),
                    extraligaPlayerName: playerDocument.extraligaPlayerName,
                    isJunior: playerDocument.isJunior,
                    dolceUserId: playerDocument.dolceUserId,
                    gabbanaUserId: playerDocument.gabbanaUserId,
                    playoffUserId: playerDocument.playoffUserId,
                    draftedWithNumberDolce:
                        playerDocument.draftedWithNumberDolce,
                    draftedWithNumberGabbana:
                        playerDocument.draftedWithNumberGabbana,
                    draftedWithNumberPlayoff:
                        playerDocument.draftedWithNumberPlayoff,
                    playerStatus: playerDocument.playerStatus,
                    statistics: playerDocument.statistics
                };
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

playersSchema.static('parsePlayers', function parsePlayers(newPlayers: string) {
    return newPlayers
        .split(',')
        .map(name => name.trim())
        .filter(Boolean)
        .map(extraligaPlayerName => {
            return { extraligaPlayerName, isJunior: false };
        });
});

playersSchema.static(
    'importPlayers',
    async function importPlayers(newPlayers: PlayersImportType[]) {
        try {
            const newPlayerNames = newPlayers.map(player => {
                return player.extraligaPlayerName;
            });

            const existingPlayers = await this.find(
                {},
                'extraligaPlayerName isJunior'
            ).exec();
            const existingPlayerNames = existingPlayers.map(player => {
                return player.extraligaPlayerName;
            });

            const playersToAdd = newPlayers.filter(player => {
                return !existingPlayerNames.includes(
                    player.extraligaPlayerName
                );
            });

            if (playersToAdd.length) {
                await this.create(
                    playersToAdd.map(player => {
                        return {
                            extraligaPlayerName: player.extraligaPlayerName,
                            isJunior: player.isJunior,
                            playerStatus: 'active'
                        };
                    })
                );
            }

            for (const existingPlayer of existingPlayers) {
                const reviewedPlayer = newPlayers.find(player => {
                    return (
                        player.extraligaPlayerName ===
                        existingPlayer.extraligaPlayerName
                    );
                });
                if (reviewedPlayer) {
                    existingPlayer.set({ isJunior: reviewedPlayer.isJunior });
                    await existingPlayer.save();
                }
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
