import { HydratedDocument, model, Model, Schema, Types } from 'mongoose';
import { z } from 'zod';

import { LigueGroupsType } from '@/db/models/ligue-groups';
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

type UserUpdateDataType = Partial<Omit<UserType, 'email' | 'password'>>;
type UserUpdatableKey = keyof Omit<UserType, 'email' | 'password'>;

interface UserMethodsType {
    updateUser: (updateData: UserUpdateDataType) => Promise<void>;
}

interface UserModelType extends Model<UserType, '', UserMethodsType> {
    getNumberOfUsersAssignedToGroup: (ligueGroupId: string) => Promise<number>;
    getUserById: (userId: string) => Promise<UserByIdDtoType>;
    isAdmin: (username: string) => Promise<boolean>;
}

export type FindByIdType = HydratedDocument<UserType, UserMethodsType> | null;

export type UserByIdDtoType = Omit<UserType, 'groupName'> & {
    userId: string;
    groupName: LigueGroupsType['groupName'];
};

type PopulatedGroupNameType = Pick<LigueGroupsType, 'groupName'> & {
    _id: Types.ObjectId;
};

type UserWithPopulatedGroupNameType = Omit<UserType, 'groupName'> & {
    groupName?: PopulatedGroupNameType;
};

export type PopulatedFindByIdType = HydratedDocument<
    UserWithPopulatedGroupNameType,
    UserMethodsType
> | null;

const userSchema = new Schema<UserType, UserModelType, UserMethodsType>({
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
    cabinetTrophy: [
        {
            season: { type: String },
            type: { type: String, enum: ['megaliga', 'grandprix'] }
        }
    ],
    isAdmin: { type: Boolean, default: false }
});

const NON_UPDATABLE_FIELDS = new Set(['email', 'password']);
const USER_UPDATABLE_FIELDS = Object.keys(userSchema.paths).filter(
    field => !NON_UPDATABLE_FIELDS.has(field)
) as UserUpdatableKey[];

userSchema.static(
    'getNumberOfUsersAssignedToGroup',
    async function getNumberOfUsersAssignedToGroup(ligueGroupId: string) {
        try {
            const count = await this.countDocuments({
                groupName: ligueGroupId
            }).exec();
            return count;
        } catch (error) {
            console.error(
                'Error fetching number of users assugned to ligue group:',
                error
            );
            throw error;
        }
    }
);

userSchema.static('getUserById', async function getUserById(userId: string) {
    try {
        const userDocument: PopulatedFindByIdType = await this.findById(userId)
            .select(
                'username coachName teamName logoUrl reachedPlayoff isFirstRoundDraftOrderDraw groupName bio cabinetTrophy'
            )
            .populate<{ groupName: PopulatedGroupNameType }>({
                path: 'groupName',
                select: 'groupName'
            })
            .exec();

        if (!userDocument) {
            throw new Error(`User not found: ${userId}`);
        }

        return {
            userId: userDocument._id.toString(),
            username: userDocument.username,
            coachName: userDocument.coachName,
            teamName: userDocument.teamName,
            logoUrl: userDocument.logoUrl,
            reachedPlayoff: userDocument.reachedPlayoff,
            isFirstRoundDraftOrderDraw: userDocument.isFirstRoundDraftOrderDraw,
            groupName: userDocument.groupName?.groupName ?? '',
            bio: userDocument.bio ?? '',
            cabinetTrophy: userDocument.cabinetTrophy ?? []
        };
    } catch (error) {
        console.error('Error fetching user by id:', error);
        throw error;
    }
});

userSchema.static('isAdmin', async function isAdmin(username: string) {
    try {
        const userDocument = await this.findOne({ username })
            .select('isAdmin')
            .exec();

        if (!userDocument) {
            throw new Error(`User not found: ${username}`);
        }

        return userDocument.isAdmin;
    } catch (error) {
        console.error('Error checking if user is admin:', error);
        throw error;
    }
});

userSchema.method(
    'updateUser',
    async function updateUser(updateData: UserUpdateDataType) {
        try {
            const safeUpdateData = Object.fromEntries(
                Object.entries(updateData).filter(
                    ([key, value]) =>
                        USER_UPDATABLE_FIELDS.includes(
                            key as UserUpdatableKey
                        ) && value !== undefined
                )
            ) as UserUpdateDataType;

            this.set(safeUpdateData);
            await this.save();
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }
);

// save user document - will be triggered directly on UserModel in place of invocation. Example of usage in db/models/__test__/user.test.ts

const UserModel = model<UserType, UserModelType>('User', userSchema);

export default UserModel;
