import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { LigueGroupsType } from '@/db/models/ligue-groups';
import { standingSchema } from '@/db/models/schema.types';
import { UserType } from '@/db/models/user';

//Standings collection represent regular season standings for current season of megaliga
export const StandingsZodSchema = standingSchema;

export type StandingsType = z.infer<typeof StandingsZodSchema>;

export type StandingsReturnType = Omit<StandingsType, 'userId'> &
    Pick<UserType, 'teamName' | 'logoUrl'>;

export type StandingsForHistoryReturnType = Omit<
    StandingsType,
    'userId' | 'ligueGroupsId'
> &
    Pick<UserType, 'teamName' | 'coachName'> & {
        ligueGroupName: LigueGroupsType['groupName'];
    };

interface StandingsModelType extends Model<StandingsType> {
    getStandings: () => Promise<StandingsReturnType[]>;
    getStandingsForHistory: () => Promise<StandingsForHistoryReturnType[]>;
}

type PopulatedUserIdType = Pick<UserType, 'teamName' | 'logoUrl'>;

type PopulatedStandingsType = Omit<StandingsType, 'userId'> & {
    userId?: PopulatedUserIdType;
};

export type PopulatedFindType = HydratedDocument<PopulatedStandingsType>;

type PopulatedStandingsForHistoryType = Omit<
    StandingsType,
    'userId' | 'ligueGroupsId'
> & {
    userId?: Pick<UserType, 'teamName' | 'coachName'>;
    ligueGroupsId?: Pick<LigueGroupsType, 'groupName'>;
};

export type PopulatedFindForHistoryType =
    HydratedDocument<PopulatedStandingsForHistoryType>;

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
            .populate<{ userId: PopulatedUserIdType }>({
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

StandingsSchema.static(
    'getStandingsForHistory',
    async function getStandingsForHistory() {
        try {
            const documents: PopulatedFindForHistoryType[] = await this.find()
                .populate<{
                    userId: Pick<UserType, 'teamName' | 'coachName'>;
                }>({
                    path: 'userId',
                    select: 'teamName coachName'
                })
                .populate<{
                    ligueGroupsId: Pick<LigueGroupsType, 'groupName'>;
                }>({
                    path: 'ligueGroupsId',
                    select: 'groupName'
                })
                .exec();

            if (!documents || documents.length === 0) {
                throw new Error('Standings not found');
            }

            return documents.map(item => {
                return {
                    place: item.place,
                    teamName: item.userId?.teamName ?? '',
                    coachName: item.userId?.coachName ?? '',
                    played: item.played,
                    wins: item.wins,
                    draw: item.draw,
                    defeat: item.defeat,
                    balance: item.balance,
                    points: item.points,
                    ligueGroupName: item.ligueGroupsId?.groupName ?? ''
                };
            });
        } catch (error) {
            console.error('Error fetching standings data for history:', error);
            throw error;
        }
    }
);

const StandingsModel = model<StandingsType, StandingsModelType>(
    'Standings',
    StandingsSchema
);

export default StandingsModel;
