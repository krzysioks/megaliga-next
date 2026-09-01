import { model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import HistoryTeamModel from '@/db/models/history/history-team';
import {
    objectIdSchema,
    historyStandingSchema
} from '@/db/models/schema.types';
import StandingsModel from '@/db/models/standings';

//HistoryRegularSeasonStandings collection represent in each document standings of regular season for given season in megaliga history
export const historyRegularSeasonStandingsZodSchema = z.object({
    season: objectIdSchema, // Reference to SeasonOps collection
    standings: z.array(historyStandingSchema)
});

export type HistoryRegularSeasonStandingsType = z.infer<
    typeof historyRegularSeasonStandingsZodSchema
>;

export type RegularSeasonStandingsToHistoryDataType =
    HistoryRegularSeasonStandingsType['standings'][number];

interface HistoryRegularSeasonStandingsModelType extends Model<HistoryRegularSeasonStandingsType> {
    saveRegularSeasonStandingsToHistory: (seasonId: string) => Promise<string>;
}

const historyRegularSeasonStandingsSchema = new Schema<
    HistoryRegularSeasonStandingsType,
    HistoryRegularSeasonStandingsModelType
>({
    season: {
        type: Schema.Types.ObjectId,
        ref: 'SeasonOps',
        required: true
    },
    standings: [
        {
            place: { type: Number, required: true },
            teamId: {
                type: Schema.Types.ObjectId,
                ref: 'HistoryTeam',
                required: true
            },
            played: { type: Number, required: true },
            wins: { type: Number, required: true },
            draw: { type: Number, required: true },
            defeat: { type: Number, required: true },
            balance: { type: Number, required: true },
            points: { type: Number, required: true },
            ligueGroup: { type: String, required: true }
        }
    ]
});

historyRegularSeasonStandingsSchema.static(
    'saveRegularSeasonStandingsToHistory',
    async function saveRegularSeasonStandingsToHistory(seasonId: string) {
        try {
            const regularSeasonStandingsData =
                await StandingsModel.getStandingsForHistory();
            let historyRegularSeasonStandingsData: RegularSeasonStandingsToHistoryDataType[] =
                [];
            for (const standing of regularSeasonStandingsData) {
                const historyTeamId =
                    await HistoryTeamModel.getHistoryTeamIdByNameAndCoachName(
                        standing.teamName,
                        standing.coachName
                    );
                const historyStandingsItem: RegularSeasonStandingsToHistoryDataType =
                    {
                        place: standing.place,
                        teamId: historyTeamId,
                        played: standing.played,
                        wins: standing.wins,
                        draw: standing.draw,
                        defeat: standing.defeat,
                        balance: standing.balance,
                        points: standing.points,
                        ligueGroup: standing.ligueGroupName
                    };
                historyRegularSeasonStandingsData = [
                    ...historyRegularSeasonStandingsData,
                    historyStandingsItem
                ];
            }

            const newHistoryRegularSeasonStandingsDocument = await this.create({
                season: seasonId,
                standings: historyRegularSeasonStandingsData
            });

            return newHistoryRegularSeasonStandingsDocument._id.toString();
        } catch (error) {
            console.error('Error saving regular season standings:', error);
            throw error;
        }
    }
);

const HistoryRegularSeasonStandingsModel = model<
    HistoryRegularSeasonStandingsType,
    HistoryRegularSeasonStandingsModelType
>('HistoryRegularSeasonStandings', historyRegularSeasonStandingsSchema);

export default HistoryRegularSeasonStandingsModel;
