import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';
import UserModel, { UserType } from '@/db/models/user';

//ChampionGrandPrix is representation of megaliga_grand_prix_champion of old megaliga database. It is used to show current Grand Prix Champion in Trybuna view

export const championGrandPrixZodSchema = z.object({
    userId: objectIdSchema
});

export type ChampionGrandPrixType = z.infer<typeof championGrandPrixZodSchema>;

type PopulatedGroupNameType = { _id: Types.ObjectId; groupName: string };

type UserWithPopulatedGroupNameType = Omit<UserType, 'groupName'> & {
    groupName?: PopulatedGroupNameType;
};

export type PopulatedFindType =
    HydratedDocument<UserWithPopulatedGroupNameType>;

interface ChampionGrandPrixModelType extends Model<ChampionGrandPrixType> {
    getChampion: () => Promise<PopulatedFindType>;
    setChampion: (userId: string) => Promise<void>;
}

const championGrandPrixSchema = new Schema<
    ChampionGrandPrixType,
    ChampionGrandPrixModelType
>({
    userId: { type: Types.ObjectId, ref: 'User' }
});

championGrandPrixSchema.static('getChampion', async function getChampion() {
    try {
        const document = await this.findOne()
            .populate<{ userId: PopulatedFindType }>({
                path: 'userId',
                populate: {
                    path: 'groupName'
                }
            })
            .exec();

        if (!document || !document.userId) {
            throw new Error('Champion not found');
        }

        return document.userId;
    } catch (error) {
        console.error('Error fetching grand prix champion:', error);
        throw error;
    }
});

championGrandPrixSchema.static(
    'setChampion',
    async function setChampion(userId: string) {
        try {
            const isValidUserId = await UserModel.exists({ _id: userId });
            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }

            await this.findOneAndUpdate(
                {}, // No filter - always operates on single document
                { userId: new Types.ObjectId(userId) },
                { upsert: true, new: true }
            ).exec();
        } catch (error) {
            console.error('Error setting grand prix champion:', error);
            throw error;
        }
    }
);

const ChampionGrandPrixModel = model<
    ChampionGrandPrixType,
    ChampionGrandPrixModelType
>('ChampionGrandPrix', championGrandPrixSchema);

export default ChampionGrandPrixModel;
