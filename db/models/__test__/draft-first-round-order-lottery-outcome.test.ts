import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import {
    DraftFirstRoundOrderLotteryOutcomeModel,
    Position
} from '@/db/models/draft/draft-first-round-order-lottery-outcome';
import LigueGroupsModel from '@/db/models/ligue-groups';
import UserModel, { UserType } from '@/db/models/user';

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

// connect to test db before running tests
beforeAll(async () => {
    const dbClient = new DBClient();
    await dbClient.connect();

    // Mock console.error to silence logs during testing
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await DraftFirstRoundOrderLotteryOutcomeModel.deleteMany();
    await UserModel.deleteMany();
    await LigueGroupsModel.deleteMany();

    const dolceGroup = await new LigueGroupsModel({
        groupName: 'dolce'
    }).save();

    const gabbanaGroup = await new LigueGroupsModel({
        groupName: 'gabbana'
    }).save();

    const dolceGroupId = dolceGroup._id.toString();
    const gabbanaGroupId = gabbanaGroup._id.toString();

    await UserModel.create([
        createUserData({
            username: 'dolce-user-one',
            coachName: 'Dolce Coach One',
            email: 'dolce-user-one@example.com',
            groupName: dolceGroupId
        }),
        createUserData({
            username: 'dolce-user-two',
            coachName: 'Dolce Coach Two',
            email: 'dolce-user-two@example.com',
            groupName: dolceGroupId
        }),
        createUserData({
            username: 'dolce-user-three',
            coachName: 'Dolce Coach Three',
            email: 'dolce-user-three@example.com',
            groupName: dolceGroupId
        }),
        createUserData({
            username: 'gabbana-user-one',
            coachName: 'Gabbana Coach One',
            email: 'gabbana-user-one@example.com',
            groupName: gabbanaGroupId
        }),
        createUserData({
            username: 'gabbana-user-two',
            coachName: 'Gabbana Coach Two',
            email: 'gabbana-user-two@example.com',
            groupName: gabbanaGroupId
        })
    ]);
});

// before any test clear collections
beforeEach(async () => {
    await DraftFirstRoundOrderLotteryOutcomeModel.deleteMany();
});

// close connection to server so that test suite will close
afterAll(async () => {
    await DraftFirstRoundOrderLotteryOutcomeModel.deleteMany();
    await UserModel.deleteMany();
    await LigueGroupsModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test DraftFirstRoundOrderLotteryOutcomeModel methods and static functions', () => {
    it('Should get first round draft order status by ligue group id', async () => {
        const dolceGroup = await LigueGroupsModel.findOne({
            groupName: 'dolce'
        }).exec();

        const gabbanaGroup = await LigueGroupsModel.findOne({
            groupName: 'gabbana'
        }).exec();

        const dolceGroupId = dolceGroup?._id.toString() || '';
        const gabbanaGroupId = gabbanaGroup?._id.toString() || '';

        const dolceUsers = await UserModel.find({
            groupName: dolceGroupId
        }).exec();

        const gabbanaUsers = await UserModel.find({
            groupName: gabbanaGroupId
        }).exec();

        await new DraftFirstRoundOrderLotteryOutcomeModel({
            ligueGroupsId: dolceGroupId,
            one: dolceUsers[0]._id,
            two: dolceUsers[1]._id,
            six: dolceUsers[2]._id
        }).save();

        await new DraftFirstRoundOrderLotteryOutcomeModel({
            ligueGroupsId: gabbanaGroupId,
            four: gabbanaUsers[0]._id,
            five: gabbanaUsers[1]._id
        }).save();

        const fetchedDraftOrderOutcomeDolce =
            await DraftFirstRoundOrderLotteryOutcomeModel.getFirstRoundDraftOrderStatusByLigueGroupId(
                dolceGroupId
            );

        const fetchedDraftOrderOutcomeGabbana =
            await DraftFirstRoundOrderLotteryOutcomeModel.getFirstRoundDraftOrderStatusByLigueGroupId(
                gabbanaGroupId
            );

        expect(fetchedDraftOrderOutcomeDolce).not.toBeNull();
        expect(fetchedDraftOrderOutcomeDolce?.one?.toString()).toBe(
            dolceUsers[0]._id.toString()
        );
        expect(fetchedDraftOrderOutcomeDolce?.two?.toString()).toBe(
            dolceUsers[1]._id.toString()
        );
        expect(fetchedDraftOrderOutcomeDolce?.three).toBeUndefined();
        expect(fetchedDraftOrderOutcomeDolce?.four).toBeUndefined();
        expect(fetchedDraftOrderOutcomeDolce?.five).toBeUndefined();
        expect(fetchedDraftOrderOutcomeDolce?.six?.toString()).toBe(
            dolceUsers[2]._id.toString()
        );

        expect(fetchedDraftOrderOutcomeGabbana).not.toBeNull();
        expect(fetchedDraftOrderOutcomeGabbana?.one).toBeUndefined();
        expect(fetchedDraftOrderOutcomeGabbana?.two).toBeUndefined();
        expect(fetchedDraftOrderOutcomeGabbana?.three).toBeUndefined();
        expect(fetchedDraftOrderOutcomeGabbana?.four?.toString()).toBe(
            gabbanaUsers[0]._id.toString()
        );
        expect(fetchedDraftOrderOutcomeGabbana?.five?.toString()).toBe(
            gabbanaUsers[1]._id.toString()
        );
        expect(fetchedDraftOrderOutcomeGabbana?.six).toBeUndefined();
    });

    describe('setPosition method', () => {
        it('Should successfully set position for a user', async () => {
            const dolceGroup = await LigueGroupsModel.findOne({
                groupName: 'dolce'
            }).exec();

            const dolceGroupId = dolceGroup?._id.toString() || '';

            const dolceUsers = await UserModel.find({
                groupName: dolceGroupId
            }).exec();

            const draftOutcome =
                await new DraftFirstRoundOrderLotteryOutcomeModel({
                    ligueGroupsId: dolceGroupId
                }).save();

            await draftOutcome.setPosition(
                dolceUsers[0]._id.toString(),
                Position.one
            );

            const updated =
                await DraftFirstRoundOrderLotteryOutcomeModel.findById(
                    draftOutcome._id
                ).exec();

            expect(updated?.one?.toString()).toBe(dolceUsers[0]._id.toString());
        });

        it('Should throw error when position is already taken', async () => {
            const dolceGroup = await LigueGroupsModel.findOne({
                groupName: 'dolce'
            }).exec();

            const dolceGroupId = dolceGroup?._id.toString() || '';

            const dolceUsers = await UserModel.find({
                groupName: dolceGroupId
            }).exec();

            const draftOutcome =
                await new DraftFirstRoundOrderLotteryOutcomeModel({
                    ligueGroupsId: dolceGroupId,
                    one: dolceUsers[0]._id
                }).save();

            await expect(
                draftOutcome.setPosition(
                    dolceUsers[1]._id.toString(),
                    Position.one
                )
            ).rejects.toThrow('Position one is already taken');
        });

        it('Should throw error when user is already assigned to a position', async () => {
            const dolceGroup = await LigueGroupsModel.findOne({
                groupName: 'dolce'
            }).exec();

            const dolceGroupId = dolceGroup?._id.toString() || '';

            const dolceUsers = await UserModel.find({
                groupName: dolceGroupId
            }).exec();

            const draftOutcome =
                await new DraftFirstRoundOrderLotteryOutcomeModel({
                    ligueGroupsId: dolceGroupId,
                    one: dolceUsers[0]._id
                }).save();

            await expect(
                draftOutcome.setPosition(
                    dolceUsers[0]._id.toString(),
                    Position.two
                )
            ).rejects.toThrow('User is already assigned to a position');
        });

        it('Should throw error when userId is invalid', async () => {
            const dolceGroup = await LigueGroupsModel.findOne({
                groupName: 'dolce'
            }).exec();

            const dolceGroupId = dolceGroup?._id.toString() || '';

            const draftOutcome =
                await new DraftFirstRoundOrderLotteryOutcomeModel({
                    ligueGroupsId: dolceGroupId
                }).save();

            const invalidUserId = new mongoose.Types.ObjectId().toString();

            await expect(
                draftOutcome.setPosition(invalidUserId, Position.one)
            ).rejects.toThrow(`Invalid userId: ${invalidUserId}`);
        });

        it('Should set position for multiple users in sequence', async () => {
            const dolceGroup = await LigueGroupsModel.findOne({
                groupName: 'dolce'
            }).exec();

            const dolceGroupId = dolceGroup?._id.toString() || '';

            const dolceUsers = await UserModel.find({
                groupName: dolceGroupId
            }).exec();

            const draftOutcome =
                await new DraftFirstRoundOrderLotteryOutcomeModel({
                    ligueGroupsId: dolceGroupId
                }).save();

            await draftOutcome.setPosition(
                dolceUsers[0]._id.toString(),
                Position.one
            );
            await draftOutcome.setPosition(
                dolceUsers[1]._id.toString(),
                Position.two
            );
            await draftOutcome.setPosition(
                dolceUsers[2]._id.toString(),
                Position.three
            );

            const updated =
                await DraftFirstRoundOrderLotteryOutcomeModel.findById(
                    draftOutcome._id
                ).exec();

            expect(updated?.one?.toString()).toBe(dolceUsers[0]._id.toString());
            expect(updated?.two?.toString()).toBe(dolceUsers[1]._id.toString());
            expect(updated?.three?.toString()).toBe(
                dolceUsers[2]._id.toString()
            );
        });
    });
});
