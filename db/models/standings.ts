import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { standingSchema } from '@/db/models/schema.types';
import { UserType } from '@/db/models/user';

//Standings collection represent regular season standings for current season of megaliga
export const StandingsZodSchema = standingSchema;

export type StandingsType = z.infer<typeof StandingsZodSchema>;

export type StandingsDtoType = Omit<StandingsType, 'userId'> &
    Pick<UserType, 'teamName' | 'logoUrl'>;

interface StandingsModelType extends Model<StandingsType> {
    getStandings: () => Promise<StandingsDtoType[]>;
}

type PopulatedStandingsType = Omit<StandingsType, 'userId'> & {
    userId?: Pick<UserType, 'teamName' | 'logoUrl'>;
};

export type PopulatedFindType = HydratedDocument<PopulatedStandingsType>;

const StandingsSchema = new Schema<StandingsType, StandingsModelType>({
    place: { type: Number, required: true },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    played: { type: Number, required: true },
    wins: { type: Number, required: true },
    draw: { type: Number, required: true },
    defeat: { type: Number, required: true },
    balance: { type: Number, required: true },
    points: { type: Number, required: true },
    ligueGroupsId: { type: Types.ObjectId, ref: 'LigueGroups' }
});

StandingsSchema.static('getStandings', async function getStandings() {
    try {
        const documents: PopulatedFindType[] = await this.find()
            .populate<{ userId: Pick<UserType, 'teamName' | 'logoUrl'> }>({
                path: 'userId',
                select: 'teamName logoUrl'
            })
            .exec();

        if (!documents || documents.length === 0) {
            throw new Error('Standings not found');
        }

        return documents.map(item => {
            return {
                place: item.place,
                teamName: item.userId?.teamName ?? '',
                logoUrl: item.userId?.logoUrl ?? '',
                played: item.played,
                wins: item.wins,
                draw: item.draw,
                defeat: item.defeat,
                balance: item.balance,
                points: item.points,
                ligueGroupsId: item.ligueGroupsId?.toString()
            };
        });
    } catch (error) {
        console.error('Error fetching standnigs data:', error);
        throw error;
    }
});

const StandingsModel = model<StandingsType, StandingsModelType>(
    'Standings',
    StandingsSchema
);

export default StandingsModel;
