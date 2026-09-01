import { model, Model, Schema } from 'mongoose';
import { z } from 'zod';

import {
    logoUrlSchema,
    nameSchema,
    objectIdSchema,
    teamNameSchema
} from '@/db/models/schema.types';

// HistoryTeam keeps a single team snapshot for a given history document (season context)
export const historyTeamZodSchema = z.object({
    historyId: objectIdSchema,
    name: teamNameSchema,
    coachName: nameSchema,
    logoUrl: logoUrlSchema
});

export type HistoryTeamType = z.infer<typeof historyTeamZodSchema>;

interface HistoryTeamModelType extends Model<HistoryTeamType> {
    saveSeasonTeams: (teams: HistoryTeamType[]) => Promise<void>;
    getHistoryTeamIdByNameAndCoachName: (
        name: HistoryTeamType['name'],
        coachName: HistoryTeamType['coachName']
    ) => Promise<string>;
}

const historyTeamSchema = new Schema<HistoryTeamType, HistoryTeamModelType>({
    historyId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    name: { type: String, required: true },
    coachName: { type: String, required: true },
    logoUrl: { type: String, required: true }
});

historyTeamSchema.static(
    'saveSeasonTeams',
    async function saveSeasonTeams(teams: HistoryTeamType[]) {
        try {
            for (const team of teams) {
                const existingTeam = await this.exists({
                    name: team.name,
                    coachName: team.coachName
                });

                if (existingTeam) {
                    continue;
                }

                await this.create(team);
            }
        } catch (error) {
            console.error('Error saving season teams:', error);
            throw error;
        }
    }
);

historyTeamSchema.static(
    'getHistoryTeamIdByNameAndCoachName',
    async function getHistoryTeamIdByNameAndCoachName(
        name: HistoryTeamType['name'],
        coachName: HistoryTeamType['coachName']
    ) {
        try {
            const document = await this.findOne({ name, coachName })
                .select('_id')
                .exec();

            if (!document) {
                throw new Error(
                    `History team not found for name: ${name} and coachName: ${coachName}`
                );
            }

            return document._id.toString();
        } catch (error) {
            console.error(
                'Error fetching history team id by name and coach name:',
                error
            );
            throw error;
        }
    }
);

const HistoryTeamModel = model<HistoryTeamType, HistoryTeamModelType>(
    'HistoryTeam',
    historyTeamSchema
);

export default HistoryTeamModel;
