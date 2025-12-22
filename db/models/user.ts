import { model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import {
    nameSchema,
    teamNameSchema,
    logoUrlSchema,
    objectIdSchema,
    booleanDefaultFalseSchema
} from '@/db/models/schema.types';

// User model is representation of megaliga_uder_data of old megaliga database
// TODOKP: Other user data needed for admin panel section will implemented later
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
    groupName: objectIdSchema
});

export type UserType = z.infer<typeof userZodSchema>;

const userSchema = new Schema<UserType>({
    username: { type: String, required: true, unique: true },
    coachName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    teamName: { type: String, required: true },
    logoUrl: { type: String, required: true },
    reachedPlayoff: { type: Boolean, default: false },
    isFirstRoundDraftOrderDraw: { type: Boolean, default: false },
    groupName: { type: Types.ObjectId, ref: 'LigueGroups' }
});

// TODOKP: Later on when implementing views we will add needed methods and static functions to User model

const UserModel = model<UserType>('User', userSchema);

export default UserModel;
