import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import SchedulePlayoffModel, {
    SchedulePlayoffByRoundDtoType,
    SchedulePlayoffByStageDtoType,
    SchedulePlayoffType
} from '@/db/models/games/schedule-playoff';
import UserModel, { UserType } from '@/db/models/user';

type SeededUser = UserType & { _id: mongoose.Types.ObjectId };

type PairSeed = {
    teamOneId: string;
    teamOneName: string;
    teamOneLogoUrl: string;
    teamTwoId: string;
    teamTwoName: string;
    teamTwoLogoUrl: string;
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
    // Playoff rounds are stage-based: semifinal 1/2, 3rdplace/final 3/4.
    pairs.flatMap((pair, index) => [
        {
            stage,
            roundNumber: stage === 'semifinal' ? 1 : 3,
            userOneId: pair.teamOneId,
            userTwoId: pair.teamTwoId,
            userOneSeed: pair.teamOneSeed,
            userTwoSeed: pair.teamTwoSeed,
            userOneScore: 42 + index,
            userTwoScore: 36 + index
        },
        {
            stage,
            roundNumber: stage === 'semifinal' ? 2 : 4,
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

    expect(groupedMatchup?.matchupOne.teamOne.logoUrl).toBe(
        expectedPair.teamOneLogoUrl
    );
    expect(groupedMatchup?.matchupOne.teamTwo.logoUrl).toBe(
        expectedPair.teamTwoLogoUrl
    );
    expect(groupedMatchup?.matchupTwo.teamOne.logoUrl).toBe(
        expectedPair.teamOneLogoUrl
    );
    expect(groupedMatchup?.matchupTwo.teamTwo.logoUrl).toBe(
        expectedPair.teamTwoLogoUrl
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
        teamOneLogoUrl: seededUsers[0].logoUrl,
        teamTwoId: seededUsers[1]._id.toString(),
        teamTwoName: seededUsers[1].teamName,
        teamTwoLogoUrl: seededUsers[1].logoUrl,
        teamOneSeed: 1,
        teamTwoSeed: 4
    },
    {
        teamOneId: seededUsers[2]._id.toString(),
        teamOneName: seededUsers[2].teamName,
        teamOneLogoUrl: seededUsers[2].logoUrl,
        teamTwoId: seededUsers[3]._id.toString(),
        teamTwoName: seededUsers[3].teamName,
        teamTwoLogoUrl: seededUsers[3].logoUrl,
        teamOneSeed: 2,
        teamTwoSeed: 3
    }
];

const getThirdPlacePair = (): PairSeed[] => [
    {
        teamOneId: seededUsers[4]._id.toString(),
        teamOneName: seededUsers[4].teamName,
        teamOneLogoUrl: seededUsers[4].logoUrl,
        teamTwoId: seededUsers[5]._id.toString(),
        teamTwoName: seededUsers[5].teamName,
        teamTwoLogoUrl: seededUsers[5].logoUrl,
        teamOneSeed: 3,
        teamTwoSeed: 4
    }
];

const getFinalPair = (): PairSeed[] => [
    {
        teamOneId: seededUsers[6]._id.toString(),
        teamOneName: seededUsers[6].teamName,
        teamOneLogoUrl: seededUsers[6].logoUrl,
        teamTwoId: seededUsers[7]._id.toString(),
        teamTwoName: seededUsers[7].teamName,
        teamTwoLogoUrl: seededUsers[7].logoUrl,
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
    const getExpectedRoundGames = (
        allPlayoffGames: SchedulePlayoffType[],
        roundNumber: number
    ) => allPlayoffGames.filter(game => game.roundNumber === roundNumber);

    const findSeededUser = (userId: string) =>
        seededUsers.find(user => user._id?.toString() === userId);

    const findFetchedRoundGame = (
        fetchedGames: SchedulePlayoffByRoundDtoType[],
        expectedGame: SchedulePlayoffType
    ) =>
        fetchedGames.find(game => {
            const expectedUserOne = findSeededUser(
                expectedGame.userOneId ?? ''
            );
            const expectedUserTwo = findSeededUser(
                expectedGame.userTwoId ?? ''
            );

            return (
                game.stage === expectedGame.stage &&
                game.userOne.teamName === expectedUserOne?.teamName &&
                game.userOne.logoUrl === expectedUserOne?.logoUrl &&
                game.userTwo.teamName === expectedUserTwo?.teamName &&
                game.userTwo.logoUrl === expectedUserTwo?.logoUrl
            );
        });

    const assertFetchedRoundGame = (
        fetchedGame: SchedulePlayoffByRoundDtoType | undefined,
        expectedGame: SchedulePlayoffType
    ) => {
        expect(fetchedGame).toBeDefined();

        const expectedUserOne = findSeededUser(expectedGame.userOneId ?? '');
        const expectedUserTwo = findSeededUser(expectedGame.userTwoId ?? '');

        expect(expectedUserOne).toBeDefined();
        expect(expectedUserTwo).toBeDefined();

        expect(fetchedGame?.roundNumber).toBe(expectedGame.roundNumber);
        expect(fetchedGame?.stage).toBe(expectedGame.stage);
        expect(fetchedGame?.userOne.teamName).toBe(expectedUserOne?.teamName);
        expect(fetchedGame?.userOne.logoUrl).toBe(expectedUserOne?.logoUrl);
        expect(fetchedGame?.userTwo.teamName).toBe(expectedUserTwo?.teamName);
        expect(fetchedGame?.userTwo.logoUrl).toBe(expectedUserTwo?.logoUrl);
        expect(fetchedGame?.userOneScore).toBe(expectedGame.userOneScore);
        expect(fetchedGame?.userTwoScore).toBe(expectedGame.userTwoScore);
    };

    test('Should return list of playoff games for round 1', async () => {
        const semifinalPairs = getSemifinalPairs();
        const thirdPlacePair = getThirdPlacePair();
        const finalPair = getFinalPair();

        const allPlayoffGames = [
            ...createStageDocs('semifinal', semifinalPairs, true),
            ...createStageDocs('3rdplace', thirdPlacePair, true),
            ...createStageDocs('final', finalPair, true)
        ];

        await SchedulePlayoffModel.create(allPlayoffGames);

        const roundOneGames: SchedulePlayoffByRoundDtoType[] =
            await SchedulePlayoffModel.getScheduleByRound(1);
        const expectedRoundOneGames = getExpectedRoundGames(allPlayoffGames, 1);

        expect(roundOneGames).toHaveLength(2);

        expectedRoundOneGames.forEach(expectedGame => {
            const game = findFetchedRoundGame(roundOneGames, expectedGame);
            assertFetchedRoundGame(game, expectedGame);
        });
    });

    test('Should return list of playoff games for round 2', async () => {
        const semifinalPairs = getSemifinalPairs();
        const thirdPlacePair = getThirdPlacePair();
        const finalPair = getFinalPair();

        const allPlayoffGames = [
            ...createStageDocs('semifinal', semifinalPairs, true),
            ...createStageDocs('3rdplace', thirdPlacePair, true),
            ...createStageDocs('final', finalPair, true)
        ];

        await SchedulePlayoffModel.create(allPlayoffGames);

        const roundTwoGames: SchedulePlayoffByRoundDtoType[] =
            await SchedulePlayoffModel.getScheduleByRound(2);
        const expectedRoundTwoGames = getExpectedRoundGames(allPlayoffGames, 2);

        expect(roundTwoGames).toHaveLength(2);

        expectedRoundTwoGames.forEach(expectedGame => {
            const game = findFetchedRoundGame(roundTwoGames, expectedGame);
            assertFetchedRoundGame(game, expectedGame);
        });
    });

    test('Should throw error if no playoff games found for given round', async () => {
        await expect(
            SchedulePlayoffModel.getScheduleByRound(1)
        ).rejects.toThrow(
            "Schedules playoff for given roundNumber: 1 don't exist: "
        );
    });

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
