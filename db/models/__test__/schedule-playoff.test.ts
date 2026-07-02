import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import SchedulePlayoffModel, {
    SchedulePlayoffByStageDtoType,
    SchedulePlayoffType
} from '@/db/models/games/schedule-playoff';
import UserModel, { UserType } from '@/db/models/user';

type SeededUser = UserType & { _id: mongoose.Types.ObjectId };

type PairSeed = {
    teamOneId: string;
    teamOneName: string;
    teamTwoId: string;
    teamTwoName: string;
    teamOneSeed: number;
    teamTwoSeed: number;
};

let seededUsers: SeededUser[];

const createUserData = (index: number): UserType => ({
    username: `user-${index + 1}`,
    coachName: `Coach ${index + 1}`,
    email: `user-${index + 1}@example.com`,
    password: 'Password1!',
    teamName: `Team ${index + 1}`,
    logoUrl: `https://example.com/team-${index + 1}.png`,
    reachedPlayoff: false,
    isFirstRoundDraftOrderDraw: false,
    groupName: new mongoose.Types.ObjectId().toString(),
    bio: `User ${index + 1} bio`,
    cabinetTrophy: [],
    isAdmin: false
});

const createStageDocs = (
    stage: SchedulePlayoffType['stage'],
    pairs: PairSeed[],
    includeSecondGameOutcome: boolean
): SchedulePlayoffType[] =>
    pairs.flatMap((pair, index) => [
        {
            stage,
            roundNumber: 1,
            userOneId: pair.teamOneId,
            userTwoId: pair.teamTwoId,
            userOneSeed: pair.teamOneSeed,
            userTwoSeed: pair.teamTwoSeed,
            userOneScore: 42 + index,
            userTwoScore: 36 + index
        },
        {
            stage,
            roundNumber: 2,
            userOneId: pair.teamOneId,
            userTwoId: pair.teamTwoId,
            userOneSeed: pair.teamOneSeed,
            userTwoSeed: pair.teamTwoSeed,
            userOneScore: includeSecondGameOutcome ? 44 + index : undefined,
            userTwoScore: includeSecondGameOutcome ? 40 + index : undefined
        }
    ]);

const assertGroupedPair = (
    results: SchedulePlayoffByStageDtoType[],
    expectedPair: PairSeed,
    includeSecondGameOutcome: boolean
) => {
    const groupedMatchup = results.find(item => {
        return (
            item.matchupOne.teamOne.teamName === expectedPair.teamOneName &&
            item.matchupOne.teamTwo.teamName === expectedPair.teamTwoName
        );
    });

    expect(groupedMatchup).toBeDefined();

    expect(groupedMatchup?.matchupTwo.teamOne.teamName).toBe(
        expectedPair.teamOneName
    );
    expect(groupedMatchup?.matchupTwo.teamTwo.teamName).toBe(
        expectedPair.teamTwoName
    );

    expect(groupedMatchup?.matchupOne.teamOne.seed).toBe(
        expectedPair.teamOneSeed
    );
    expect(groupedMatchup?.matchupOne.teamTwo.seed).toBe(
        expectedPair.teamTwoSeed
    );
    expect(groupedMatchup?.matchupTwo.teamOne.seed).toBe(
        expectedPair.teamOneSeed
    );
    expect(groupedMatchup?.matchupTwo.teamTwo.seed).toBe(
        expectedPair.teamTwoSeed
    );

    expect(groupedMatchup?.matchupOne.teamOne.score).toBeDefined();
    expect(groupedMatchup?.matchupOne.teamTwo.score).toBeDefined();

    if (includeSecondGameOutcome) {
        expect(groupedMatchup?.matchupTwo.teamOne.score).toBeDefined();
        expect(groupedMatchup?.matchupTwo.teamTwo.score).toBeDefined();
    } else {
        expect(groupedMatchup?.matchupTwo.teamOne.score).toBeUndefined();
        expect(groupedMatchup?.matchupTwo.teamTwo.score).toBeUndefined();
    }
};

const getSemifinalPairs = (): PairSeed[] => [
    {
        teamOneId: seededUsers[0]._id.toString(),
        teamOneName: seededUsers[0].teamName,
        teamTwoId: seededUsers[1]._id.toString(),
        teamTwoName: seededUsers[1].teamName,
        teamOneSeed: 1,
        teamTwoSeed: 4
    },
    {
        teamOneId: seededUsers[2]._id.toString(),
        teamOneName: seededUsers[2].teamName,
        teamTwoId: seededUsers[3]._id.toString(),
        teamTwoName: seededUsers[3].teamName,
        teamOneSeed: 2,
        teamTwoSeed: 3
    }
];

const getThirdPlacePair = (): PairSeed[] => [
    {
        teamOneId: seededUsers[4]._id.toString(),
        teamOneName: seededUsers[4].teamName,
        teamTwoId: seededUsers[5]._id.toString(),
        teamTwoName: seededUsers[5].teamName,
        teamOneSeed: 3,
        teamTwoSeed: 4
    }
];

const getFinalPair = (): PairSeed[] => [
    {
        teamOneId: seededUsers[6]._id.toString(),
        teamOneName: seededUsers[6].teamName,
        teamTwoId: seededUsers[7]._id.toString(),
        teamTwoName: seededUsers[7].teamName,
        teamOneSeed: 1,
        teamTwoSeed: 2
    }
];

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const dbClient = new DBClient();
    await dbClient.connect();
});

beforeEach(async () => {
    await SchedulePlayoffModel.deleteMany();
    await UserModel.deleteMany();

    seededUsers = (
        await UserModel.create(
            Array.from({ length: 8 }, (_, index) => createUserData(index))
        )
    ).map(user => user.toObject()) as SeededUser[];
});

afterAll(async () => {
    await SchedulePlayoffModel.deleteMany();
    await UserModel.deleteMany();
    await mongoose.disconnect();
});

describe('Test SchedulePlayoffModel methods and static functions', () => {
    test('It should return outcome of 1st game in semifinal stage with properly grouped teams (we expect 2 matchups)', async () => {
        const semifinalPairs = getSemifinalPairs();
        await SchedulePlayoffModel.create(
            createStageDocs('semifinal', semifinalPairs, false)
        );

        const results =
            await SchedulePlayoffModel.getScheduleByStage('semifinal');

        expect(results).toHaveLength(2);
        semifinalPairs.forEach(pair => {
            assertGroupedPair(results, pair, false);
        });
    });

    test('It should return outcome of 1st and 2nd game in semifinal stage with properly grouped teams (we expect 2 matchups)', async () => {
        const semifinalPairs = getSemifinalPairs();
        await SchedulePlayoffModel.create(
            createStageDocs('semifinal', semifinalPairs, true)
        );

        const results =
            await SchedulePlayoffModel.getScheduleByStage('semifinal');

        expect(results).toHaveLength(2);
        semifinalPairs.forEach(pair => {
            assertGroupedPair(results, pair, true);
        });
    });

    test('It should return outcome of 1st game in 3rdplace stage with properly grouped teams (we expect 1 matchup)', async () => {
        const thirdPlacePair = getThirdPlacePair();
        await SchedulePlayoffModel.create(
            createStageDocs('3rdplace', thirdPlacePair, false)
        );

        const results =
            await SchedulePlayoffModel.getScheduleByStage('3rdplace');

        expect(results).toHaveLength(1);
        assertGroupedPair(results, thirdPlacePair[0], false);
    });

    test('It should return outcome of 1st and 2nd game in 3rdplace stage with properly grouped teams (we expect 1 matchup)', async () => {
        const thirdPlacePair = getThirdPlacePair();
        await SchedulePlayoffModel.create(
            createStageDocs('3rdplace', thirdPlacePair, true)
        );

        const results =
            await SchedulePlayoffModel.getScheduleByStage('3rdplace');

        expect(results).toHaveLength(1);
        assertGroupedPair(results, thirdPlacePair[0], true);
    });

    test('It should return outcome of 1st game in final stage with properly grouped teams (we expect 1 matchup)', async () => {
        const finalPair = getFinalPair();
        await SchedulePlayoffModel.create(
            createStageDocs('final', finalPair, false)
        );

        const results = await SchedulePlayoffModel.getScheduleByStage('final');

        expect(results).toHaveLength(1);
        assertGroupedPair(results, finalPair[0], false);
    });

    test('It should return outcome of 1st and 2nd game in final stage with properly grouped teams (we expect 1 matchup)', async () => {
        const finalPair = getFinalPair();
        await SchedulePlayoffModel.create(
            createStageDocs('final', finalPair, true)
        );

        const results = await SchedulePlayoffModel.getScheduleByStage('final');

        expect(results).toHaveLength(1);
        assertGroupedPair(results, finalPair[0], true);
    });
});
