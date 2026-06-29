import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { HistoryTeamType } from '@/db/models/history/history-team';
import { objectIdSchema } from '@/db/models/schema.types';
import { SeasonOpsType } from '@/db/models/season-ops';

//HistoryGrandPrixChampion is representation of megaliga_grandprix_champion_history of old megaliga database. It is used to show Hall of Grand Prix Fame section in Trybuna view

export const historyGrandPrixChampionZodSchema = z.object({
    season: objectIdSchema,
    teamId: objectIdSchema
});

export type HistoryGrandPrixChampionType = z.infer<
    typeof historyGrandPrixChampionZodSchema
>;

export type ChampionsHistoryGrandPrixDtoType = {
    seasonName: SeasonOpsType['name'];
    coachName: HistoryTeamType['coachName'];
};

type PopulatedHistoryGrandPrixChampionType = Omit<
    HistoryGrandPrixChampionType,
    'season' | 'teamId'
> & {
    season?: Pick<SeasonOpsType, 'name'>;
    teamId?: Pick<HistoryTeamType, 'coachName'>;
};

export type PopulatedFindType =
    HydratedDocument<PopulatedHistoryGrandPrixChampionType>;

interface HistoryGrandPrixChampionModelType extends Model<HistoryGrandPrixChampionType> {
    getChampionsHistory: () => Promise<ChampionsHistoryGrandPrixDtoType[]>;
}

const historyGrandPrixChampionSchema = new Schema<
    HistoryGrandPrixChampionType,
    HistoryGrandPrixChampionModelType
>({
    season: {
        type: Schema.Types.ObjectId,
        ref: 'SeasonOps',
        required: true
    },
    teamId: { type: Types.ObjectId, ref: 'HistoryTeam', required: true }
});

historyGrandPrixChampionSchema.static(
    'getChampionsHistory',
    async function getChampionsHistory() {
        try {
            const documents: PopulatedFindType[] = await this.find()
                .populate<{ season: Pick<SeasonOpsType, 'name'> }>({
                    path: 'season',
                    select: 'name'
                })
                .populate<{
                    teamId: Pick<HistoryTeamType, 'coachName'>;
                }>({
                    path: 'teamId',
                    select: 'coachName'
                })
                .exec();

            return documents.map(item => ({
                seasonName: item.season?.name ?? '',
                coachName: item.teamId?.coachName ?? ''
            }));
        } catch (error) {
            console.error(
                'Error fetching grand prix champion history data:',
                error
            );
            throw error;
        }
    }
);

const HistoryGrandPrixChampionModel = model<
    HistoryGrandPrixChampionType,
    HistoryGrandPrixChampionModelType
>('HistoryGrandPrixChampion', historyGrandPrixChampionSchema);

// TODOKP: Need to implement static method to populate data from HistoryTeam: coachName.

export default HistoryGrandPrixChampionModel;
