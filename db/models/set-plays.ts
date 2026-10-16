import { model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import {
    MIN_REGULAR_SEASON_ROUND,
    MAX_REGULAR_SEASON_ROUND
} from '@/db/db.constants';
import SetPlaysDataModel from '@/db/models/games/set-plays-data';
import StartingLineupModel from '@/db/models/games/starting-lineup';
import {
    SetPlayEnumType,
    standardStringSchema
} from '@/db/models/schema.types';
import UserModel from '@/db/models/user';
import { validateSetPlayConstraints } from '@/db/models/validation.utils';

export const setPlaysZodSchema = z.object({
    name: standardStringSchema,
    type: z.nativeEnum(SetPlayEnumType)
});

export type SetPlaysType = z.infer<typeof setPlaysZodSchema>;

export type SetPlaysReturnType = SetPlaysType & {
    id: Types.ObjectId;
};

interface SetPlaysModelType extends Model<SetPlaysType> {
    getAvailableSetPlays: (
        userId: string,
        roundNumber: number
    ) => Promise<SetPlaysReturnType[]>;
}

const setPlaysSchema = new Schema<SetPlaysType, SetPlaysModelType>({
    name: { type: String, required: true, maxlength: 255 },
    type: { type: String, required: true, enum: Object.values(SetPlayEnumType) }
});

setPlaysSchema.static(
    'getAvailableSetPlays',
    async function getAvailableSetPlays(userId: string, roundNumber: number) {
        try {
            if (
                roundNumber < MIN_REGULAR_SEASON_ROUND ||
                roundNumber > MAX_REGULAR_SEASON_ROUND
            ) {
                throw new Error(
                    `Invalid roundNumber: ${roundNumber}. Must be between ${MIN_REGULAR_SEASON_ROUND} and ${MAX_REGULAR_SEASON_ROUND}`
                );
            }

            const isValidUserId = await UserModel.exists({ _id: userId });
            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }

            const startingLineupDocument =
                await StartingLineupModel.getUserStartingLineupByRound(
                    userId,
                    roundNumber
                );
            if (!startingLineupDocument) {
                throw new Error('Starting lineup not found');
            }

            const { setPlayList } =
                await SetPlaysDataModel.getSetPlayListByStartingLineupId(
                    startingLineupDocument._id.toString()
                );
            const availableTypes = validateSetPlayConstraints(setPlayList);
            const documents = await this.find().exec();

            if (!documents.length) {
                throw new Error('No set plays found');
            }

            return documents
                .filter(document => availableTypes.includes(document.type))
                .map(document => {
                    return {
                        id: document._id,
                        name: document.name,
                        type: document.type
                    };
                });
        } catch (error) {
            console.error('Error fetching set plays:', error);
            throw error;
        }
    }
);

const SetPlaysModel = model<SetPlaysType, SetPlaysModelType>(
    'SetPlays',
    setPlaysSchema
);
export default SetPlaysModel;
