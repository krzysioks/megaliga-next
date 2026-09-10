import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { objectIdSchema } from '@/db/models/schema.types';
import UserModel, { UserType } from '@/db/models/user';

//Champion is representation of megaliga_champion of old megaliga database

export const championZodSchema = z.object({
    userId: objectIdSchema
});

export type ChampionType = z.infer<typeof championZodSchema>;

export type ChampionReturnType = Pick<
    UserType,
    'teamName' | 'logoUrl' | 'coachName'
>;

type PopulatedUserType = Omit<UserType, 'userId'> & {
    userId?: Pick<UserType, 'teamName' | 'logoUrl' | 'coachName'> & {
        _id: Types.ObjectId;
    };
};

export type PopulatedFindType = HydratedDocument<PopulatedUserType>;

interface ChampionModelType extends Model<ChampionType> {
    getChampion: () => Promise<ChampionReturnType>;
    setChampion: (userId: string) => Promise<void>;
}

const championSchema = new Schema<ChampionType, ChampionModelType>({
    userId: { type: Types.ObjectId, ref: 'User' }
});

championSchema.static('getChampion', async function getChampion() {
    try {
        const document = await this.findOne()
            .populate<PopulatedFindType>({
                path: 'userId',
                select: 'teamName coachName logoUrl'
            })
            .exec();

        if (!document || !document.userId) {
            throw new Error('Champion not found');
        }

        return {
            teamName: document.userId.teamName,
            coachName: document.userId.coachName,
            logoUrl: document.userId.logoUrl
        };
    } catch (error) {
        console.error('Error fetching champion:', error);
        throw error;
    }
});

championSchema.static(
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
            console.error('Error setting champion:', error);
            throw error;
        }
    }
);

const ChampionModel = model<ChampionType, ChampionModelType>(
    'Champion',
    championSchema
);

export default ChampionModel;
