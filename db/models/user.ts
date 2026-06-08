import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import {
    nameSchema,
    teamNameSchema,
    logoUrlSchema,
    objectIdSchema,
    booleanDefaultFalseSchema,
    standardStringSchema,
    thropyTypeSchema
} from '@/db/models/schema.types';

// User model is representation of megaliga_uder_data of old megaliga database
export const userZodSchema = z.object({
    username: nameSchema,
    coachName: nameSchema,
    email: z.string().email('Nieprawidłowy format adresu e-mail'),
    password: z
        .string()
        .nonempty('Hasło jest wymagane')
        .min(8, 'Hasło musi mieć co najmniej 8 znaków')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])/,
            'Hasło musi zawierać co najmniej jedną małą literę, jedną wielką literę, jedną cyfrę i jeden znak specjalny'
        ),
    teamName: teamNameSchema,
    logoUrl: logoUrlSchema,
    reachedPlayoff: booleanDefaultFalseSchema,
    isFirstRoundDraftOrderDraw: booleanDefaultFalseSchema, //old is_draw_round1_draft_order
    groupName: objectIdSchema,
    bio: standardStringSchema,
    // based on cabinetTrophy field Dashboard -> Gablota will be rendered
    cabinetTrophy: z.array(
        z.object({
            season: z.string(), //year of the season
            type: thropyTypeSchema //for what turnament this trophy was won, megaliga or grandprix
        })
    ),
    isAdmin: z.boolean().default(false) //field added for admin panel, to distinguish between regular users and admins
});

export type UserType = z.infer<typeof userZodSchema>;

interface UserModelType extends Model<UserType> {
    getNumberOfUsersAssignedToGroup: (ligueGroupId: string) => Promise<number>;
}

export type FindByIdType = HydratedDocument<UserType> | null;

const userSchema = new Schema<UserType>({
    username: { type: String, required: true, unique: true },
    coachName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    teamName: { type: String, required: true },
    logoUrl: { type: String, required: true },
    reachedPlayoff: { type: Boolean, default: false },
    isFirstRoundDraftOrderDraw: { type: Boolean, default: false },
    groupName: { type: Types.ObjectId, ref: 'LigueGroups' },
    bio: { type: String },
    cabinetTrophy: {
        type: [{ season: String, type: thropyTypeSchema._def.values }]
    },
    isAdmin: { type: Boolean, default: false }
});

userSchema.static(
    'getNumberOfUsersAssignedToGroup',
    async function getNumberOfUsersAssignedToGroup(ligueGroupId: string) {
        try {
            const count = await this.countDocuments({
                groupName: ligueGroupId
            }).exec();
            return count;
        } catch (error) {
            console.error('Error fetching ligue group ids:', error);
            throw error;
        }
    }
);

// save user document - will be triggered directly on UserModel in place of invocation. Example of usage in db/models/__test__/user.test.ts

// TODOKP: 1. later we need to implement static function to fetch all users with populated groupName field and method to fetch desired user by userId with populated groupName field.

const UserModel = model<UserType, UserModelType>('User', userSchema);

export default UserModel;
