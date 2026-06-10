import { model, HydratedDocument, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import {
    draftNumberSchema,
    objectIdSchema,
    standardStringSchema,
    statusEnumSchema
} from '@/db/models/schema.types';

//Players is representation of megaliga_players of old megaliga database.

type PlayerAssignmentType = 'dolce' | 'gabbana' | 'playoff';

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

interface PlayersModelType extends Model<PlayersType> {
    getPlayersByUserId: (
        userId: string,
        type: PlayerAssignmentType
    ) => Promise<HydratedDocument<PlayersType>[]>;
}

const playersSchema = new Schema<PlayersType, PlayersModelType>({
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

const PlayersModel = model<PlayersType, PlayersModelType>(
    'Players',
    playersSchema
);

export default PlayersModel;
