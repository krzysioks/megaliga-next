import crypto from 'crypto';

import { hash } from 'bcrypt-ts';
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
    isAdmin: z.boolean().default(false), //field added for admin panel, to distinguish between regular users and admins
    passwordResetObj: z
        .object({
            resetToken: z.string(),
            resetTokenExpiration: z.date()
        })
        .optional()
});

export type UserType = z.infer<typeof userZodSchema>;

// fields excluded here are either system-managed or have server-side defaults, not provided when adding a new user
export const addUserZodSchema = userZodSchema.omit({
    reachedPlayoff: true,
    isFirstRoundDraftOrderDraw: true,
    groupName: true,
    cabinetTrophy: true,
    passwordResetObj: true
});

export type AddUserDataType = z.infer<typeof addUserZodSchema>;

type UserUpdateDataType = Partial<Omit<UserType, 'password'>>;
type UserUpdatableKey = keyof Omit<UserType, 'password'>;

interface UserMethodsType {
    updateUser: (updateData: UserUpdateDataType) => Promise<void>;
    resetPassword: (newPassword: string) => Promise<void>;
    changePassword: (newPassword: string) => Promise<void>;
}

export type GeneratePasswordResetTokenReturnType = {
    rawToken: string;
    username: string;
};

export interface NonAdminUserReturnType {
    userId: string;
    username: UserType['username'];
}

interface UserModelType extends Model<UserType, '', UserMethodsType> {
    getNumberOfUsersAssignedToGroup: (ligueGroupId: string) => Promise<number>;
    getUserById: (userId: string) => Promise<UserByIdDtoType>;
    getAllUsers: () => Promise<UserByIdDtoType[]>;
    isAdmin: (username: string) => Promise<boolean>;
    generatePasswordResetToken: (
        email: string
    ) => Promise<GeneratePasswordResetTokenReturnType>;
    getUserByResetPasswordToken: (token: string) => Promise<FindByIdType>;
    getNonAdminUsers: () => Promise<NonAdminUserReturnType[]>;
    deleteUserById: (userId: string) => Promise<void>;
    addUser: (userData: AddUserDataType) => Promise<UserByIdDtoType>;
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
    isAdmin: { type: Boolean, default: false },
    passwordResetObj: {
        resetToken: { type: String },
        resetTokenExpiration: { type: Date }
    }
});

const NON_UPDATABLE_FIELDS = new Set(['password']);
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

userSchema.static(
    'generatePasswordResetToken',
    async function generatePasswordResetToken(email: string) {
        try {
            userZodSchema.shape.email.parse(email);

            const userDocument = await this.findOne({ email })
                .select('username passwordResetObj')
                .exec();

            if (!userDocument) {
                throw new Error(`User not found: ${email}`);
            }

            const rawToken = crypto.randomBytes(32).toString('hex');
            // store hash only — raw token travels in the URL, never persisted
            const hashedToken = crypto
                .createHash('sha256')
                .update(rawToken)
                .digest('hex');

            userDocument.set({
                passwordResetObj: {
                    resetToken: hashedToken,
                    resetTokenExpiration: new Date(Date.now() + 60 * 60 * 1000)
                }
            });
            await userDocument.save();

            return { rawToken, username: userDocument.username };
        } catch (error) {
            console.error('Error generating password reset token:', error);
            throw error;
        }
    }
);

userSchema.static(
    'getUserByResetPasswordToken',
    async function getUserByResetPasswordToken(token: string) {
        try {
            const hashedToken = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            const userDocument = await this.findOne({
                'passwordResetObj.resetToken': hashedToken,
                'passwordResetObj.resetTokenExpiration': { $gt: new Date() }
            }).exec();

            if (!userDocument) {
                throw new Error('Invalid or expired reset token');
            }

            return userDocument;
        } catch (error) {
            console.error('Error finding user by reset password token:', error);
            throw error;
        }
    }
);

// used to fetch all non admin users to populate dropdown in admin panel for selecting user to edit by admin
userSchema.static('getNonAdminUsers', async function getNonAdminUsers() {
    try {
        const userDocuments = await this.find({ isAdmin: false })
            .select('username _id')
            .exec();

        if (!userDocuments || !userDocuments.length) {
            throw new Error(`Users not found`);
        }

        return userDocuments.map(user => ({
            userId: user._id.toString(),
            username: user.username
        }));
    } catch (error) {
        console.error('Error fetching non-admin users:', error);
        throw error;
    }
});

userSchema.static(
    'deleteUserById',
    async function deleteUserById(userId: string) {
        try {
            const isValidUserId = await this.exists({ _id: userId });
            if (!isValidUserId) {
                throw new Error(`Invalid userId: ${userId}`);
            }

            await this.findByIdAndDelete(userId);
        } catch (error) {
            console.error('Error deleting user by id:', error);
            throw error;
        }
    }
);

userSchema.static('addUser', async function addUser(userData: AddUserDataType) {
    try {
        addUserZodSchema.parse(userData);

        const newUser = await this.create(userData);

        return await this.getUserById(newUser._id.toString());
    } catch (error) {
        console.error('Error adding new user:', error);
        throw error;
    }
});

userSchema.static('getAllUsers', async function getAllUsers() {
    try {
        const userDocuments: PopulatedFindByIdType[] = await this.find({})
            .select(
                'username coachName teamName logoUrl reachedPlayoff isFirstRoundDraftOrderDraw groupName bio cabinetTrophy'
            )
            .populate<{ groupName: PopulatedGroupNameType }>({
                path: 'groupName',
                select: 'groupName'
            })
            .exec();

        if (!userDocuments.length) {
            throw new Error(`Users not found`);
        }

        return userDocuments.map(userDocument => {
            return {
                userId: userDocument?._id.toString(),
                username: userDocument?.username,
                coachName: userDocument?.coachName,
                teamName: userDocument?.teamName,
                logoUrl: userDocument?.logoUrl,
                reachedPlayoff: userDocument?.reachedPlayoff,
                isFirstRoundDraftOrderDraw:
                    userDocument?.isFirstRoundDraftOrderDraw,
                groupName: userDocument?.groupName?.groupName ?? '',
                bio: userDocument?.bio ?? '',
                cabinetTrophy: userDocument?.cabinetTrophy ?? []
            };
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
});

// this method is used to update user fields (Edit profile) except for password.
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

// method used to change password from user profile view
userSchema.method(
    'changePassword',
    async function changePassword(newPassword: string) {
        try {
            userZodSchema.shape.password.parse(newPassword);
            const hashedPassword = await hash(newPassword, 12);

            this.set({
                password: hashedPassword
            });
            await this.save();
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }
);

// method used to change password from reset password view
userSchema.method(
    'resetPassword',
    async function resetPassword(newPassword: string) {
        try {
            userZodSchema.shape.password.parse(newPassword);
            const hashedPassword = await hash(newPassword, 12);

            this.set({
                password: hashedPassword,
                passwordResetObj: undefined // Clear the reset token and expiration
            });
            await this.save();
        } catch (error) {
            console.error('Error resetting password:', error);
            throw error;
        }
    }
);

// save user document - will be triggered directly on UserModel in place of invocation. Example of usage in db/models/__test__/user.test.ts

const UserModel = model<UserType, UserModelType>('User', userSchema);

export default UserModel;
