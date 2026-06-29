import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import LigueGroupsModel from '@/db/models/ligue-groups';
import StandingsModel, {
    StandingsDtoType,
    StandingsType
} from '@/db/models/standings';
import UserModel, { UserType } from '@/db/models/user';

let ligueGroupId: string;
let createdUsers: (UserType & { _id: mongoose.Types.ObjectId })[];
let standingsToCreate: StandingsType[];

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const dbClient = new DBClient();
    await dbClient.connect();
});

beforeEach(async () => {
    await StandingsModel.deleteMany();
    await UserModel.deleteMany();
    await LigueGroupsModel.deleteMany();

    const ligueGroup = await new LigueGroupsModel({
        groupName: 'dolce'
    }).save();

    ligueGroupId = ligueGroup._id.toString();

    const usersPayload = Array.from({ length: 12 }, (_, index) => ({
        username: `user-${index + 1}`,
        coachName: `Coach ${index + 1}`,
        email: `user-${index + 1}@example.com`,
        password: 'Password1!',
        teamName: `Team ${index + 1}`,
        logoUrl: `https://example.com/team-${index + 1}.png`,
        reachedPlayoff: false,
        isFirstRoundDraftOrderDraw: false,
        groupName: ligueGroupId,
        bio: `User ${index + 1} bio`,
        cabinetTrophy: [],
        isAdmin: false
    }));

    createdUsers = (await UserModel.create(usersPayload)).map(user =>
        user.toObject()
    ) as (UserType & { _id: mongoose.Types.ObjectId })[];

    standingsToCreate = createdUsers.map((user, index) => ({
        place: index + 1,
        userId: user._id.toString(),
        played: 22,
        wins: 12 - index,
        draw: index % 3,
        defeat: 10 + index,
        balance: 120 - index,
        points: 36 - index,
        ligueGroupsId: ligueGroupId
    }));
});

afterAll(async () => {
    await StandingsModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test StandingsModel methods and static functions', () => {
    test('Should return standings for 12 teams', async () => {
        await StandingsModel.create(standingsToCreate);

        const standings: StandingsDtoType[] =
            await StandingsModel.getStandings();
        console.log('standings: ', standings);
        expect(standings).toHaveLength(12);

        standingsToCreate.forEach(expectedStanding => {
            const seededUser = createdUsers.find(
                user => user._id.toString() === expectedStanding.userId
            );

            expect(seededUser).toBeDefined();

            const fetchedStanding = standings.find(
                standing => standing.place === expectedStanding.place
            );

            expect(fetchedStanding).toBeDefined();
            expect(fetchedStanding?.played).toBe(expectedStanding.played);
            expect(fetchedStanding?.wins).toBe(expectedStanding.wins);
            expect(fetchedStanding?.draw).toBe(expectedStanding.draw);
            expect(fetchedStanding?.defeat).toBe(expectedStanding.defeat);
            expect(fetchedStanding?.balance).toBe(expectedStanding.balance);
            expect(fetchedStanding?.points).toBe(expectedStanding.points);
            expect(fetchedStanding?.ligueGroupsId).toBe(
                expectedStanding.ligueGroupsId
            );
            expect(fetchedStanding?.teamName).toBe(seededUser?.teamName);
            expect(fetchedStanding?.logoUrl).toBe(seededUser?.logoUrl);
        });
    });

    test('Should throw error if no standings fetched from db', async () => {
        await expect(StandingsModel.getStandings()).rejects.toThrow(
            'Standings not found'
        );
    });
});
