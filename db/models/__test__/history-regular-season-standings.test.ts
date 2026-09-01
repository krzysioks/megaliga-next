import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import HistoryRegularSeasonStandingsModel, {
    HistoryRegularSeasonStandingsType
} from '@/db/models/history/history-regular-season-standings';
import HistoryTeamModel, {
    HistoryTeamType
} from '@/db/models/history/history-team';
import LigueGroupsModel from '@/db/models/ligue-groups';
import StandingsModel, { StandingsType } from '@/db/models/standings';
import UserModel, { UserType } from '@/db/models/user';

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

beforeEach(async () => {
    await HistoryRegularSeasonStandingsModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await StandingsModel.deleteMany();
    await UserModel.deleteMany();
    await LigueGroupsModel.deleteMany();
});

afterAll(async () => {
    await HistoryRegularSeasonStandingsModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await StandingsModel.deleteMany();
    await UserModel.deleteMany();
    await LigueGroupsModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test HistoryRegularSeasonStandingsModel methods and static functions', () => {
    const createUserData = (overrides: Partial<UserType> = {}): UserType => ({
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

    const createStandingData = (
        overrides: Partial<StandingsType> = {}
    ): StandingsType => ({
        place: 1,
        userId: new mongoose.Types.ObjectId().toString(),
        played: 22,
        wins: 15,
        draw: 3,
        defeat: 4,
        balance: 40,
        points: 48,
        ligueGroupsId: new mongoose.Types.ObjectId().toString(),
        ...overrides
    });

    const createHistoryTeamData = (
        overrides: Partial<HistoryTeamType> = {}
    ): HistoryTeamType => ({
        historyId: new mongoose.Types.ObjectId().toString(),
        name: 'Default Team',
        coachName: 'Default Coach',
        logoUrl: 'https://example.com/default-team.png',
        ...overrides
    });

    describe('saveRegularSeasonStandingsToHistory', () => {
        test('should throw error if await StandingsModel.getStandingsForHistory() will not return data', async () => {
            const seasonId = new mongoose.Types.ObjectId().toString();

            await expect(
                HistoryRegularSeasonStandingsModel.saveRegularSeasonStandingsToHistory(
                    seasonId
                )
            ).rejects.toThrow('Standings not found');
        });

        test('should throw error if await HistoryTeamModel.getHistoryTeamIdByNameAndCoachName will not return data', async () => {
            const ligueGroup = await new LigueGroupsModel({
                groupName: 'dolce'
            }).save();

            const user = await new UserModel(
                createUserData({ groupName: ligueGroup._id.toString() })
            ).save();

            await StandingsModel.create(
                createStandingData({
                    userId: user._id.toString(),
                    ligueGroupsId: ligueGroup._id.toString()
                })
            );

            const seasonId = new mongoose.Types.ObjectId().toString();

            // no matching HistoryTeam document created for this user's teamName/coachName
            await expect(
                HistoryRegularSeasonStandingsModel.saveRegularSeasonStandingsToHistory(
                    seasonId
                )
            ).rejects.toThrow(
                `History team not found for name: ${user.teamName} and coachName: ${user.coachName}`
            );
        });

        test('should properly create a document with history regular season data with all data with correct type and values', async () => {
            const ligueGroup = await new LigueGroupsModel({
                groupName: 'dolce'
            }).save();

            const user = await new UserModel(
                createUserData({
                    teamName: 'Team Alpha',
                    coachName: 'Coach Alpha',
                    groupName: ligueGroup._id.toString()
                })
            ).save();

            await StandingsModel.create(
                createStandingData({
                    place: 3,
                    userId: user._id.toString(),
                    played: 22,
                    wins: 18,
                    draw: 1,
                    defeat: 3,
                    balance: 55,
                    points: 55,
                    ligueGroupsId: ligueGroup._id.toString()
                })
            );

            const historyTeam = await new HistoryTeamModel(
                createHistoryTeamData({
                    name: 'Team Alpha',
                    coachName: 'Coach Alpha'
                })
            ).save();

            const seasonId = new mongoose.Types.ObjectId().toString();

            const savedDocumentId =
                await HistoryRegularSeasonStandingsModel.saveRegularSeasonStandingsToHistory(
                    seasonId
                );

            const savedDocument: HistoryRegularSeasonStandingsType | null =
                await HistoryRegularSeasonStandingsModel.findById(
                    savedDocumentId
                )
                    .lean()
                    .exec();

            expect(savedDocument).not.toBeNull();
            expect(savedDocument?.season?.toString()).toBe(seasonId);
            expect(savedDocument?.standings).toHaveLength(1);

            const savedStanding = savedDocument?.standings[0];

            expect(savedStanding?.place).toBe(3);
            expect(savedStanding?.played).toBe(22);
            expect(savedStanding?.wins).toBe(18);
            expect(savedStanding?.draw).toBe(1);
            expect(savedStanding?.defeat).toBe(3);
            expect(savedStanding?.balance).toBe(55);
            expect(savedStanding?.points).toBe(55);
            // teamId must reference the HistoryTeam document matching the standing's teamName/coachName
            expect(savedStanding?.teamId?.toString()).toBe(
                historyTeam._id.toString()
            );
            // ligueGroup must be the actual group name the team was assigned to, not its id
            expect(savedStanding?.ligueGroup).toBe('dolce');
        });
    });
});
