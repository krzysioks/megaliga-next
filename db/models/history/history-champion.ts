import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { HistoryTeamType } from '@/db/models/history/history-team';
import { objectIdSchema } from '@/db/models/schema.types';

//HistoryChampion is representation of megaliga_history_champion of old megaliga database. It is used to show Hall of Fame section in Trybuna view

export const historyChampionZodSchema = z.object({
    season: objectIdSchema,
    teamId: objectIdSchema
});

export type HistoryChampionType = z.infer<typeof historyChampionZodSchema>;

type PopulatedSeasonType = { name: string };
type PopulatedHitoryTeamType = Pick<HistoryTeamType, 'name' | 'logoUrl'>;

type PopulatedHistoryChampionType = Omit<HistoryChampionType, 'season'> & {
    season?: PopulatedSeasonType;
    teamId?: PopulatedHitoryTeamType;
};

export type PopulatedFindType = HydratedDocument<PopulatedHistoryChampionType>;
interface HistoryChampionModelType extends Model<HistoryChampionType> {
    getChampionsHistory: () => Promise<PopulatedFindType[]>;
}

const historyChampionSchema = new Schema<
    HistoryChampionType,
    HistoryChampionModelType
>({
    season: {
        type: Schema.Types.ObjectId,
        ref: 'SeasonOps',
        required: true
    },
    teamId: { type: Types.ObjectId, ref: 'HistoryTeam', required: true }
});

historyChampionSchema.static(
    'getChampionsHistory',
    async function getChampionsHistory() {
        try {
            return await this.find()
                .populate({
                    path: 'season',
                    select: 'name'
                })
                .populate({
                    path: 'teamId',
                    select: 'name logoUrl'
                })
                .exec();
        } catch (error) {
            console.error('Error fetching chmpion history data:', error);
            throw error;
        }
    }
);

const HistoryChampionModel = model<
    HistoryChampionType,
    HistoryChampionModelType
>('HistoryChampion', historyChampionSchema);

export default HistoryChampionModel;
