import { model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import SchedulePlayoffModel from '@/db/models/games/schedule-playoff';
import HistoryTeamModel from '@/db/models/history/history-team';
import {
    objectIdSchema,
    standingPlayoffSchema
} from '@/db/models/schema.types';

//HistoryPlayoffStandings collection in each document represents standings of playoffs for given season in megaliga history
export const historyPlayoffStandingsZodSchema = z.object({
    season: objectIdSchema, // Reference to SeasonOps collection
    standings: z.array(standingPlayoffSchema)
});

export type HistoryPlayoffStandingsType = z.infer<
    typeof historyPlayoffStandingsZodSchema
>;

export type PlayoffStandingsToHistoryDataType =
    HistoryPlayoffStandingsType['standings'][number];

interface HistoryPlayoffStandingsModelType extends Model<HistoryPlayoffStandingsType> {
    savePlayoffStandingsToHistory: (seasonId: string) => Promise<string>;
}

const historyPlayoffStandingsSchema = new Schema<
    HistoryPlayoffStandingsType,
    HistoryPlayoffStandingsModelType
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
            }
        }
    ]
});

historyPlayoffStandingsSchema.static(
    'savePlayoffStandingsToHistory',
    async function savePlayoffStandingsToHistory(seasonId: string) {
        try {
            const playoffStandingsData =
                await SchedulePlayoffModel.getStandingsForHistory();
            let historyPlayoffStandingsData: PlayoffStandingsToHistoryDataType[] =
                [];
            for (const standing of playoffStandingsData) {
                const historyTeamId =
                    await HistoryTeamModel.getHistoryTeamIdByNameAndCoachName(
                        standing.teamName,
                        standing.coachName
                    );
                const historyStandingsItem: PlayoffStandingsToHistoryDataType =
                    {
                        place: standing.place,
                        teamId: historyTeamId
                    };
                historyPlayoffStandingsData = [
                    ...historyPlayoffStandingsData,
                    historyStandingsItem
                ];
            }

            const newHistoryPlayoffStandingsDocument = await this.create({
                season: seasonId,
                standings: historyPlayoffStandingsData
            });

            return newHistoryPlayoffStandingsDocument._id.toString();
        } catch (error) {
            console.error('Error saving playoff standings:', error);
            throw error;
        }
    }
);

const HistoryPlayoffStandingsModel = model<
    HistoryPlayoffStandingsType,
    HistoryPlayoffStandingsModelType
>('HistoryPlayoffStandings', historyPlayoffStandingsSchema);

export default HistoryPlayoffStandingsModel;
