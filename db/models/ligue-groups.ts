import { Model, model, Schema } from 'mongoose';
import { z } from 'zod';

// LigueGroups model represents megaliga_ligue_groups table. It should contain only documents, representing groups that are used in given season.
export const ligueGroupsZodSchema = z.object({
    groupName: z
        .string()
        .min(2, 'Nazwa grupy musi mieć co najmniej 2 znaki')
        .max(30, 'Nazwa grupy musi mieć mniej niż 30 znaków')
});

export type LigueGroupsType = z.infer<typeof ligueGroupsZodSchema>;

interface LigueGroupsModelType extends Model<LigueGroupsType> {
    getLigueGrouspId: () => Promise<string[]>;
}

const LigueGroupsSchema = new Schema<LigueGroupsType, LigueGroupsModelType>({
    groupName: { type: String, required: true }
});

LigueGroupsSchema.static('getLigueGrouspId', async function getLigueGrouspId() {
    try {
        const groups = await this.find(
            {
                groupName: { $in: ['dolce', 'gabbana'] }
            },
            { _id: 1 }
        ).exec();
        return groups.map(group => group._id.toString());
    } catch (error) {
        console.error('Error fetching ligue group ids:', error);
        throw error;
    }
});

const LigueGroupsModel = model<LigueGroupsType, LigueGroupsModelType>(
    'LigueGroups',
    LigueGroupsSchema
);
export default LigueGroupsModel;
