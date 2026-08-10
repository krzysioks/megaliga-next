import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import LigueGroupsModel from '@/db/models/ligue-groups';
import UserModel, {
    FindByIdType,
    UserByIdDtoType,
    UserType
} from '@/db/models/user';

// connect to test db before running tests
beforeAll(async () => {
    const dbClient = new DBClient();
    await dbClient.connect();
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

// before any test tear down clear database
beforeEach(async () => {
    await UserModel.deleteMany();
    await LigueGroupsModel.deleteMany();
});

//close connection to server so, that test suite will close
afterAll(async () => {
    await UserModel.deleteMany();
    await LigueGroupsModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test UserModel methods and static functions', () => {
    const createUserData = (overrides: Partial<UserType> = {}) => ({
        username: 'user-one',
        coachName: 'Coach One',
        email: 'user-one@example.com',
        password: 'Password1!',
        teamName: 'Team One',
        logoUrl: 'https://example.com/team-one.png',
        reachedPlayoff: false,
        isFirstRoundDraftOrderDraw: false,
        groupName: new mongoose.Types.ObjectId().toString(),
        bio: 'User one bio',
        cabinetTrophy: [],
        isAdmin: false,
        ...overrides
    });

    test('Should get user data by userId', async () => {
        const user = await new UserModel(createUserData()).save();
        const userId = user._id.toString();
        const fetchedUser: FindByIdType =
            await UserModel.findById(userId).exec();

        expect(fetchedUser).not.toBeNull();
        expect(fetchedUser?.username).toBe('user-one');
        expect(fetchedUser?.coachName).toBe('Coach One');
        expect(fetchedUser?.email).toBe('user-one@example.com');
        expect(fetchedUser?.teamName).toBe('Team One');
        expect(fetchedUser?.logoUrl).toBe('https://example.com/team-one.png');
        expect(fetchedUser?.reachedPlayoff).toBe(false);
        expect(fetchedUser?.isFirstRoundDraftOrderDraw).toBe(false);
        expect(fetchedUser?.bio).toBe('User one bio');
        expect(fetchedUser?.cabinetTrophy).toEqual([]);
        expect(fetchedUser?.isAdmin).toBe(false);
    });
    test('Should get user by id with populated groupName and cabinetTrophy', async () => {
        const group = await new LigueGroupsModel({
            groupName: 'dolce'
        }).save();
        const user = await new UserModel(
            createUserData({
                username: 'populated-group-user',
                email: 'populated-group-user@example.com',
                groupName: group._id.toString(),
                cabinetTrophy: [
                    { season: '2024', type: 'megaliga' },
                    { season: '2025', type: 'grandprix' }
                ]
            })
        ).save();

        const fetchedUser: UserByIdDtoType = await UserModel.getUserById(
            user._id.toString()
        );

        expect(fetchedUser).not.toBeNull();
        expect(fetchedUser.userId).toBe(user._id.toString());
        expect(fetchedUser.groupName).toBe('dolce');
        expect(fetchedUser.cabinetTrophy).toHaveLength(2);
        expect(fetchedUser.cabinetTrophy?.[0]?.season).toBe('2024');
        expect(fetchedUser.cabinetTrophy?.[0]?.type).toBe('megaliga');
        expect(fetchedUser.cabinetTrophy?.[1]?.season).toBe('2025');
        expect(fetchedUser.cabinetTrophy?.[1]?.type).toBe('grandprix');
    });
    test('Should call getNumberOfUsersAssignedToGroup and return proper number of users assigned to given ligue group', async () => {
        const dolceGroup = await new LigueGroupsModel({
            groupName: 'dolce'
        }).save();

        const gabbanaGroup = await new LigueGroupsModel({
            groupName: 'gabbana'
        }).save();
        const notDrawnGroup = await new LigueGroupsModel({
            groupName: 'nie wylosowano'
        }).save();
        const dolceId = dolceGroup._id.toString();
        const gabbanaId = gabbanaGroup._id.toString();
        const notDrawnId = notDrawnGroup._id.toString();

        const baseUserData = {
            password: 'Password1!',
            teamName: 'Team One',
            logoUrl: 'https://example.com/team-one.png',
            reachedPlayoff: false,
            isFirstRoundDraftOrderDraw: false,
            bio: 'User one bio',
            cabinetTrophy: [],
            isAdmin: false
        };

        const usersToCreate = [
            {
                username: 'user-one',
                coachName: 'Coach One',
                email: 'user-one@example.com',
                groupName: dolceId
            },
            {
                username: 'user-two',
                coachName: 'Coach Two',
                email: 'user-two@example.com',
                groupName: dolceId
            },
            {
                username: 'user-three',
                coachName: 'Coach Three',
                email: 'user-three@example.com',
                groupName: dolceId
            },
            {
                username: 'user-four',
                coachName: 'Coach Four',
                email: 'user-four@example.com',
                groupName: gabbanaId
            },
            {
                username: 'user-five',
                coachName: 'Coach Five',
                email: 'user-five@example.com',
                groupName: gabbanaId
            },
            {
                username: 'user-six',
                coachName: 'Coach Six',
                email: 'user-six@example.com',
                groupName: notDrawnId
            },
            {
                username: 'user-seven',
                coachName: 'Coach Seven',
                email: 'user-seven@example.com',
                groupName: notDrawnId
            }
        ];

        await UserModel.create(
            usersToCreate.map(user => ({
                ...baseUserData,
                ...user
            }))
        );
        const countDolce =
            await UserModel.getNumberOfUsersAssignedToGroup(dolceId);
        const countGabbana =
            await UserModel.getNumberOfUsersAssignedToGroup(gabbanaId);

        expect(countDolce).toBe(3);
        expect(countGabbana).toBe(2);
    });
    test('Should call getNumberOfUsersAssignedToGroup and return 0 if none of the user is assigned to given ligue group', async () => {
        const dolceGroup = await new LigueGroupsModel({
            groupName: 'dolce'
        }).save();

        const gabbanaGroup = await new LigueGroupsModel({
            groupName: 'gabbana'
        }).save();
        const notDrawnGroup = await new LigueGroupsModel({
            groupName: 'nie wylosowano'
        }).save();
        const dolceId = dolceGroup._id.toString();
        const gabbanaId = gabbanaGroup._id.toString();
        const notDrawnId = notDrawnGroup._id.toString();

        const baseUserData = {
            password: 'Password1!',
            teamName: 'Team One',
            logoUrl: 'https://example.com/team-one.png',
            reachedPlayoff: false,
            isFirstRoundDraftOrderDraw: false,
            bio: 'User one bio',
            cabinetTrophy: [],
            isAdmin: false
        };

        const usersToCreate = [
            {
                username: 'user-six',
                coachName: 'Coach Six',
                email: 'user-six@example.com',
                groupName: notDrawnId
            },
            {
                username: 'user-seven',
                coachName: 'Coach Seven',
                email: 'user-seven@example.com',
                groupName: notDrawnId
            }
        ];

        await UserModel.create(
            usersToCreate.map(user => ({
                ...baseUserData,
                ...user
            }))
        );
        const countDolce =
            await UserModel.getNumberOfUsersAssignedToGroup(dolceId);
        const countGabbana =
            await UserModel.getNumberOfUsersAssignedToGroup(gabbanaId);

        expect(countDolce).toBe(0);
        expect(countGabbana).toBe(0);
    });

    test('Should throw error if username is not valid in isAdmin method', async () => {
        const invalidUsername = 'missing-user';

        await expect(UserModel.isAdmin(invalidUsername)).rejects.toThrow(
            `User not found: ${invalidUsername}`
        );
    });

    test('Should return true if user is admin', async () => {
        const adminUser = await new UserModel(
            createUserData({
                email: 'admin-user@example.com',
                username: 'admin-user',
                isAdmin: true
            })
        ).save();

        const isAdmin = await UserModel.isAdmin(adminUser.username);

        expect(isAdmin).toBe(true);
    });

    test('Should return false if user is not admin', async () => {
        const regularUser = await new UserModel(
            createUserData({
                email: 'regular-user@example.com',
                username: 'regular-user',
                isAdmin: false
            })
        ).save();

        const isAdmin = await UserModel.isAdmin(regularUser.username);

        expect(isAdmin).toBe(false);
    });

    test('Should update allowed fields in updateUser method', async () => {
        const user = await new UserModel(
            createUserData({
                email: 'update-allowed@example.com',
                username: 'update-allowed-user'
            })
        ).save();

        await user.updateUser({
            coachName: 'Updated Coach',
            teamName: 'Updated Team',
            reachedPlayoff: true,
            bio: 'Updated bio'
        });

        const updatedUser: FindByIdType = await UserModel.findById(
            user._id
        ).exec();

        expect(updatedUser).not.toBeNull();
        expect(updatedUser?.coachName).toBe('Updated Coach');
        expect(updatedUser?.teamName).toBe('Updated Team');
        expect(updatedUser?.reachedPlayoff).toBe(true);
        expect(updatedUser?.bio).toBe('Updated bio');
    });

    test('Should not update non-editable fields in updateUser method', async () => {
        const user = await new UserModel(
            createUserData({
                email: 'non-editable@example.com',
                username: 'non-editable-user',
                password: 'Password1!'
            })
        ).save();

        await user.updateUser({
            coachName: 'Updated Coach'
        });

        // Runtime guard should ignore non-editable fields, even if payload is casted.
        await user.updateUser({
            email: 'changed@example.com',
            password: 'NewPassword1!'
        } as unknown as Parameters<typeof user.updateUser>[0]);

        const updatedUser: FindByIdType = await UserModel.findById(
            user._id
        ).exec();

        expect(updatedUser).not.toBeNull();
        expect(updatedUser?.coachName).toBe('Updated Coach');
        expect(updatedUser?.email).toBe('non-editable@example.com');
        expect(updatedUser?.password).toBe('Password1!');
    });

    test('Should ignore fields with undefined value in updateUser method', async () => {
        const user = await new UserModel(
            createUserData({
                email: 'undefined-update@example.com',
                username: 'undefined-update-user',
                coachName: 'Coach Before',
                teamName: 'Team Before'
            })
        ).save();

        await user.updateUser({
            coachName: undefined,
            teamName: 'Team After'
        });

        const updatedUser: FindByIdType = await UserModel.findById(
            user._id
        ).exec();

        expect(updatedUser).not.toBeNull();
        expect(updatedUser?.coachName).toBe('Coach Before');
        expect(updatedUser?.teamName).toBe('Team After');
    });
});

describe('Test password reset flow', () => {
    const createUserData = (overrides: Partial<UserType> = {}) => ({
        username: 'reset-user',
        coachName: 'Reset Coach',
        email: 'reset-user@example.com',
        password: 'Password1!',
        teamName: 'Reset Team',
        logoUrl: 'https://example.com/reset-team.png',
        reachedPlayoff: false,
        isFirstRoundDraftOrderDraw: false,
        groupName: new mongoose.Types.ObjectId().toString(),
        bio: '',
        cabinetTrophy: [],
        isAdmin: false,
        ...overrides
    });

    describe('generatePasswordResetToken', () => {
        test('Should generate raw token, hash it, save on user document and return rawToken and username', async () => {
            const user = await new UserModel(createUserData()).save();

            const result = await UserModel.generatePasswordResetToken(
                user.email
            );

            const updatedUser = await UserModel.findById(user._id).exec();

            expect(result.rawToken).toBeDefined();
            expect(result.username).toBe(user.username);
            // raw token must not be stored — only its hash is persisted
            expect(updatedUser?.passwordResetObj?.resetToken).not.toBe(
                result.rawToken
            );
            expect(updatedUser?.passwordResetObj?.resetToken).toHaveLength(64);
            expect(
                updatedUser?.passwordResetObj?.resetTokenExpiration
            ).toBeDefined();
            expect(
                updatedUser!.passwordResetObj!.resetTokenExpiration > new Date()
            ).toBe(true);
        });

        test('Should throw error if email does not match valid email format', async () => {
            await expect(
                UserModel.generatePasswordResetToken('not-an-email')
            ).rejects.toThrow();
        });

        test('Should throw error if no user found with given email', async () => {
            await expect(
                UserModel.generatePasswordResetToken('nobody@example.com')
            ).rejects.toThrow('User not found: nobody@example.com');
        });
    });

    describe('getUserByResetPasswordToken', () => {
        test('Should hash raw token and return matching user document', async () => {
            const user = await new UserModel(createUserData()).save();
            const { rawToken } = await UserModel.generatePasswordResetToken(
                user.email
            );

            const foundUser =
                await UserModel.getUserByResetPasswordToken(rawToken);

            expect(foundUser).not.toBeNull();
            expect(foundUser!._id.toString()).toBe(user._id.toString());
        });

        test('Should throw error if hashed token does not match any user', async () => {
            await expect(
                UserModel.getUserByResetPasswordToken('invalid-token-value')
            ).rejects.toThrow('Invalid or expired reset token');
        });

        test('Should throw error if token is expired', async () => {
            const user = await new UserModel(createUserData()).save();
            const crypto = await import('crypto');
            const rawToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto
                .createHash('sha256')
                .update(rawToken)
                .digest('hex');

            // store already-expired token
            await UserModel.findByIdAndUpdate(user._id, {
                passwordResetObj: {
                    resetToken: hashedToken,
                    resetTokenExpiration: new Date(Date.now() - 1000)
                }
            });

            await expect(
                UserModel.getUserByResetPasswordToken(rawToken)
            ).rejects.toThrow('Invalid or expired reset token');
        });
    });

    describe('resetPassword', () => {
        test('Should hash and update password if new password meets requirements', async () => {
            const user = await new UserModel(createUserData()).save();
            const { rawToken } = await UserModel.generatePasswordResetToken(
                user.email
            );
            const foundUser =
                await UserModel.getUserByResetPasswordToken(rawToken);

            await foundUser!.resetPassword('NewPassword2@');

            const updatedUser = await UserModel.findById(user._id).exec();

            expect(updatedUser?.password).not.toBe('NewPassword2@');
            expect(updatedUser?.password).not.toBe('Password1!');
            // Mongoose leaves an empty subdocument wrapper — assert token fields are cleared
            expect(updatedUser?.passwordResetObj?.resetToken).toBeUndefined();
            expect(
                updatedUser?.passwordResetObj?.resetTokenExpiration
            ).toBeUndefined();
        });

        test('Should throw error if new password does not meet schema requirements', async () => {
            const user = await new UserModel(createUserData()).save();

            await expect(user.resetPassword('weak')).rejects.toThrow();
        });
    });
});
