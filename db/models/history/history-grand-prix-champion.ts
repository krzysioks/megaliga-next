import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { HistoryTeamType } from '@/db/models/history/history-team';
import { objectIdSchema } from '@/db/models/schema.types';

//HistoryGrandPrixChampion is representation of megaliga_grandprix_champion_history of old megaliga database. It is used to show Hall of Grand Prix Fame section in Trybuna view

export const historyGrandPrixChampionZodSchema = z.object({
    season: objectIdSchema,
    teamId: objectIdSchema
});

export type HistoryGrandPrixChampionType = z.infer<
    typeof historyGrandPrixChampionZodSchema
>;

type PopulatedSeasonType = { name: string };
type PopulatedHitoryTeamType = Pick<HistoryTeamType, 'coachName'>;

type PopulatedHistoryGrandPrixChampionType = Omit<
    HistoryGrandPrixChampionType,
    'season'
> & {
    season?: PopulatedSeasonType;
    teamId?: PopulatedHitoryTeamType;
};

export type PopulatedFindType =
    HydratedDocument<PopulatedHistoryGrandPrixChampionType>;
interface HistoryGrandPrixChampionModelType extends Model<HistoryGrandPrixChampionType> {
    getChampionsHistory: () => Promise<PopulatedFindType[]>;
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
            return this.find()
                .populate({
                    path: 'season',
                    select: 'name'
                })
                .populate({
                    path: 'teamId',
                    select: 'coachName'
                })
                .exec();
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
