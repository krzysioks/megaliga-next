import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import {
    draftNumberSchema,
    objectIdSchema,
    standardStringSchema
} from '@/db/models/schema.types';

//Players is representation of megaliga_players of old megaliga database.

const PLAYER_STATUS_ENUM = ['active', 'inactive'] as const;

export const playersZodSchema = z.object({
    extraligaPlayerName: standardStringSchema,
    dolceUserId: objectIdSchema,
    gabbanaUserId: objectIdSchema,
    playoffUserId: objectIdSchema,
    draftedWithNumberDolce: draftNumberSchema,
    draftedWithNumberGabbana: draftNumberSchema,
    draftedWithNumberPlayoff: draftNumberSchema,
    playerStatus: z.enum(PLAYER_STATUS_ENUM).default('active')
});

export type PlayersType = z.infer<typeof playersZodSchema>;

const playersSchema = new Schema<PlayersType>({
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
    }
});

const PlayersModel = model<PlayersType>('Players', playersSchema);

export default PlayersModel;
