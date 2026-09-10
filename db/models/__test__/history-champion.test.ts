import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import ChampionModel from '@/db/models/champion';
import HistoryModel from '@/db/models/history/history';
import HistoryChampionModel, {
    ChampionsHistoryDtoType,
    HistoryChampionType
} from '@/db/models/history/history-champion';
import HistoryTeamModel, {
    HistoryTeamType
} from '@/db/models/history/history-team';
import SeasonOpsModel, { SeasonOpsType } from '@/db/models/season-ops';
import UserModel, { UserType } from '@/db/models/user';

// connect to test db before running tests
beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const dbClient = new DBClient();
    await dbClient.connect();
});

// before any test tear down clear database
beforeEach(async () => {
    await HistoryChampionModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await HistoryModel.deleteMany();
    await SeasonOpsModel.deleteMany();
    await ChampionModel.deleteMany();
    await UserModel.deleteMany();
});

//close connection to server so, that test suite will close
afterAll(async () => {
    await HistoryChampionModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await HistoryModel.deleteMany();
    await SeasonOpsModel.deleteMany();
    await ChampionModel.deleteMany();
    await UserModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test HistoryChampionModel methods and static functions', () => {
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

    const createSeasonData = (
        name: string,
        overrides: Partial<SeasonOpsType> = {}
    ): SeasonOpsType => ({
        name,
        isCurrentSeason: false,
        numberOfGroups: 2,
        showGroupNames: false,
        isScoreCalculatded: {
            1: false,
            2: false,
            3: false,
            4: false,
            5: false,
            6: false,
            7: false,
            8: false,
            9: false,
            10: false,
            11: false,
            12: false,
            13: false,
            14: false
        },
        isScoreCalculatdedPlayoff: {
            1: false,
            2: false,
            3: false,
            4: false
        },
        ...overrides
    });

    const createHistoryTeamData = (
        historyId: string,
        overrides: Partial<HistoryTeamType> = {}
    ): HistoryTeamType => ({
        historyId,
        name: 'Default Team',
        coachName: 'Default Coach',
        logoUrl: 'https://example.com/default-team.png',
        ...overrides
    });

    describe('getChampionsHistory', () => {
        test('Should call getChampionsHistory and return populated champions for 3 seasons', async () => {
            const seasons = await SeasonOpsModel.create([
                createSeasonData('2023'),
                createSeasonData('2024'),
                createSeasonData('2025')
            ]);

            const historyDocuments = await HistoryModel.create([
                { season: seasons[0]._id.toString() },
                { season: seasons[1]._id.toString() },
                { season: seasons[2]._id.toString() }
            ]);

            const teams = await HistoryTeamModel.create([
                createHistoryTeamData(historyDocuments[0]._id.toString(), {
                    name: 'Falcons 2023',
                    logoUrl: 'https://example.com/falcons-2023.png'
                }),
                createHistoryTeamData(historyDocuments[0]._id.toString(), {
                    name: 'Wolves 2023',
                    logoUrl: 'https://example.com/wolves-2023.png'
                }),
                createHistoryTeamData(historyDocuments[1]._id.toString(), {
                    name: 'Falcons 2024',
                    logoUrl: 'https://example.com/falcons-2024.png'
                }),
                createHistoryTeamData(historyDocuments[1]._id.toString(), {
                    name: 'Wolves 2024',
                    logoUrl: 'https://example.com/wolves-2024.png'
                }),
                createHistoryTeamData(historyDocuments[2]._id.toString(), {
                    name: 'Falcons 2025',
                    logoUrl: 'https://example.com/falcons-2025.png'
                }),
                createHistoryTeamData(historyDocuments[2]._id.toString(), {
                    name: 'Wolves 2025',
                    logoUrl: 'https://example.com/wolves-2025.png'
                })
            ]);

            const championsToCreate = [
                {
                    season: seasons[0]._id.toString(),
                    teamId: teams[0]._id.toString(),
                    expectedSeasonName: '2023',
                    expectedTeamName: 'Falcons 2023',
                    expectedLogoUrl: 'https://example.com/falcons-2023.png'
                },
                {
                    season: seasons[1]._id.toString(),
                    teamId: teams[3]._id.toString(),
                    expectedSeasonName: '2024',
                    expectedTeamName: 'Wolves 2024',
                    expectedLogoUrl: 'https://example.com/wolves-2024.png'
                },
                {
                    season: seasons[2]._id.toString(),
                    teamId: teams[4]._id.toString(),
                    expectedSeasonName: '2025',
                    expectedTeamName: 'Falcons 2025',
                    expectedLogoUrl: 'https://example.com/falcons-2025.png'
                }
            ];

            await HistoryChampionModel.create(
                championsToCreate.map(champion => ({
                    season: champion.season,
                    teamId: champion.teamId
                }))
            );

            const result: ChampionsHistoryDtoType[] =
                await HistoryChampionModel.getChampionsHistory();

            expect(result).toHaveLength(3);

            championsToCreate.forEach(expected => {
                const champion = result.find(
                    item => item.seasonName === expected.expectedSeasonName
                );

                expect(champion).toBeDefined();
                expect(champion?.seasonName).toBe(expected.expectedSeasonName);
                expect(champion?.teamName).toBe(expected.expectedTeamName);
                expect(champion?.logoUrl).toBe(expected.expectedLogoUrl);
            });
        });
    });

    describe('saveChamptionToHistory', () => {
        test('should throw error if current champion is not found', async () => {
            const seasonId = new mongoose.Types.ObjectId().toString();

            await expect(
                HistoryChampionModel.saveChamptionToHistory(seasonId)
            ).rejects.toThrow('Champion not found');
        });

        test('should throw error if matching history team is not found', async () => {
            const user = await new UserModel(createUserData()).save();
            await ChampionModel.setChampion(user._id.toString());

            const seasonId = new mongoose.Types.ObjectId().toString();

            // no matching HistoryTeam document created for this user's teamName/coachName
            await expect(
                HistoryChampionModel.saveChamptionToHistory(seasonId)
            ).rejects.toThrow(
                `History team not found for name: ${user.teamName} and coachName: ${user.coachName}`
            );
        });

        test('should save a new history champion document referencing the matching history team', async () => {
            const user = await new UserModel(
                createUserData({
                    teamName: 'Team Alpha',
                    coachName: 'Coach Alpha'
                })
            ).save();
            await ChampionModel.setChampion(user._id.toString());

            const historyTeam = await new HistoryTeamModel(
                createHistoryTeamData(
                    new mongoose.Types.ObjectId().toString(),
                    {
                        name: 'Team Alpha',
                        coachName: 'Coach Alpha'
                    }
                )
            ).save();

            const seasonId = new mongoose.Types.ObjectId().toString();

            await HistoryChampionModel.saveChamptionToHistory(seasonId);

            const savedDocuments: HistoryChampionType[] =
                await HistoryChampionModel.find().lean().exec();

            expect(savedDocuments).toHaveLength(1);
            expect(savedDocuments[0]?.season?.toString()).toBe(seasonId);
            expect(savedDocuments[0]?.teamId?.toString()).toBe(
                historyTeam._id.toString()
            );
        });
    });
});
