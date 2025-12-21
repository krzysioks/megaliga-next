import { model, Schema } from 'mongoose';
import { z } from 'zod';

// LigueGroups model represents megaliga_ligue_groups table

export const ligueGroupsZodSchema = z.object({
    groupName: z
        .string()
        .min(2, 'Nazwa grupy musi mieć co najmniej 2 znaki')
        .max(30, 'Nazwa grupy musi mieć mniej niż 30 znaków')
});

export type LigueGroupsType = z.infer<typeof ligueGroupsZodSchema>;

const LigueGroupsSchema = new Schema<LigueGroupsType>({
    groupName: { type: String, required: true }
});

export const LigueGroupsModel = model<LigueGroupsType>(
    'LigueGroups',
    LigueGroupsSchema
);
