import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { HistoryTeamType } from '@/db/models/history/history-team';
import { objectIdSchema } from '@/db/models/schema.types';
import { SeasonOpsType } from '@/db/models/season-ops';

//HistoryChampion is representation of megaliga_history_champion of old megaliga database. It is used to show Hall of Fame section in Trybuna view

export const historyChampionZodSchema = z.object({
    season: objectIdSchema,
    teamId: objectIdSchema
});

export type HistoryChampionType = z.infer<typeof historyChampionZodSchema>;

export type ChampionsHistoryDtoType = {
    seasonName: SeasonOpsType['name'];
    teamName: HistoryTeamType['name'];
    logoUrl: HistoryTeamType['logoUrl'];
};

type PopulatedHistoryChampionType = Omit<
    HistoryChampionType,
    'season' | 'teamId'
> & {
    season?: Pick<SeasonOpsType, 'name'>;
    teamId?: Pick<HistoryTeamType, 'name' | 'logoUrl'>;
};

export type PopulatedFindType = HydratedDocument<PopulatedHistoryChampionType>;

interface HistoryChampionModelType extends Model<HistoryChampionType> {
    getChampionsHistory: () => Promise<ChampionsHistoryDtoType[]>;
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
            const documents: PopulatedFindType[] = await this.find()
                .populate<{ season: Pick<SeasonOpsType, 'name'> }>({
                    path: 'season',
                    select: 'name'
                })
                .populate<{
                    teamId: Pick<HistoryTeamType, 'name' | 'logoUrl'>;
                }>({
                    path: 'teamId',
                    select: 'name logoUrl'
                })
                .exec();

            return documents.map(item => ({
                seasonName: item.season?.name ?? '',
                teamName: item.teamId?.name ?? '',
                logoUrl: item.teamId?.logoUrl ?? ''
            }));
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
