import type { TeamCalculationDetailsType } from '@/db/models/schema.types';
import type { StatisticsStageType } from '@/db/statistics.types';

import mongoose from 'mongoose';

import { DBClient } from '@/db/db-client';
import { STARTING_LINEUP_PLAYER_COUNT } from '@/db/db.constants';
import { createCalculationDetails } from '@/db/models/__test__/fixtures/calculation-details';
import ScoreDetailsModel from '@/db/models/games/score-details';
import ScoreDetailsPlayoffModel from '@/db/models/games/score-details-playoff';
import HistoryGamesModel from '@/db/models/history/history-games';
import HistoryGamesScoreDetailsModel from '@/db/models/history/history-games-score-details';
import HistoryTeamModel from '@/db/models/history/history-team';
import PlayersModel from '@/db/models/players';
import SeasonOpsModel from '@/db/models/season-ops';
import UserModel from '@/db/models/user';
import * as scoreCalculationUtils from '@/db/score-calculation.utils';
import { getRiderStatistics, getTrainerStatistics } from '@/db/statistics';

let seasonId: string;
let userOneId: string;
let userTwoId: string;
let playerIds: string[];

async function clearFixtures() {
    await ScoreDetailsModel.deleteMany();
    await ScoreDetailsPlayoffModel.deleteMany();
    await HistoryGamesModel.deleteMany();
    await HistoryGamesScoreDetailsModel.deleteMany();
    await HistoryTeamModel.deleteMany();
    await PlayersModel.deleteMany();
    await UserModel.deleteMany();
    await SeasonOpsModel.deleteMany();
}

beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await new DBClient().connect();
});
beforeEach(async () => {
    await clearFixtures();
    const season = await SeasonOpsModel.create({
        name: '2026',
        isCurrentSeason: true,
        numberOfGroups: 1,
        isScoreCalculatded: { 1: true, 2: true, 3: false },
        isScoreCalculatdedPlayoff: { 1: true }
    });
    seasonId = season._id.toString();
    const users = await UserModel.create(
        [0, 1].map(index => {
            return {
                username: `statistics-user-${index}`,
                email: `statistics-${index}@example.com`,
                password: 'Password1!',
                coachName: `Coach ${index}`,
                teamName: `Team ${index}`,
                logoUrl: 'https://example.com/logo.png'
            };
        })
    );
    userOneId = users[0]._id.toString();
    userTwoId = users[1]._id.toString();
    const players = await PlayersModel.create(
        Array.from({ length: STARTING_LINEUP_PLAYER_COUNT + 1 }, (_, index) => {
            return {
                extraligaPlayerName: `Rider ${index}`,
                dolceUserId: userOneId
            };
        })
    );
    playerIds = players.map(player => player._id.toString());
});
afterAll(async () => {
    await clearFixtures();
    await mongoose.disconnect();
    jest.restoreAllMocks();
});

function createDetails(): TeamCalculationDetailsType {
    const details = createCalculationDetails();
    details.players = playerIds
        .slice(0, STARTING_LINEUP_PLAYER_COUNT)
        .map(playerId => {
            return {
                playerId,
                nominalPlayerId: playerId,
                actualStartCount: 0,
                basePoints: 0,
                functionPoints: 0,
                rolePoints: 0,
                setPlayPoints: 0,
                function: null,
                role: null
            };
        });
    details.trainer = { heatPoints: 0, setPlayPoints: 0 };
    details.setPlayResults = [];
    return details;
}

async function seedScoredMatches() {
    const firstOne = createDetails();
    Object.assign(firstOne.players[0], {
        nominalPlayerId: playerIds[STARTING_LINEUP_PLAYER_COUNT],
        basePoints: 12,
        functionPoints: 2,
        rolePoints: 3,
        setPlayPoints: -2,
        actualStartCount: 4,
        function: 'Lider',
        role: 'PN'
    });
    firstOne.trainer = { heatPoints: 5, setPlayPoints: 4 };
    const firstTwo = createDetails();
    Object.assign(firstTwo.players[0], {
        basePoints: 3,
        actualStartCount: 1,
        function: 'Joker',
        role: 'KB'
    });
    const secondOne = createDetails();
    Object.assign(secondOne.players[0], {
        basePoints: 6,
        setPlayPoints: 3,
        actualStartCount: 2,
        function: 'Lider'
    });
    secondOne.trainer = { heatPoints: 1, setPlayPoints: -2 };
    const secondTwo = createDetails();
    Object.assign(secondTwo.players[0], { function: 'Kapitan', role: 'P' });
    const first = {
        scheduleId: new mongoose.Types.ObjectId(),
        roundNumber: 1,
        teamOne: { userId: userOneId, calculationDetails: firstOne },
        teamTwo: { userId: userTwoId, calculationDetails: firstTwo }
    };
    await ScoreDetailsModel.create(
        [
            first,
            { ...first },
            {
                scheduleId: new mongoose.Types.ObjectId(),
                roundNumber: 2,
                teamOne: { userId: userOneId, calculationDetails: secondOne },
                teamTwo: { userId: userTwoId, calculationDetails: secondTwo }
            }
        ],
        { ordered: true }
    );
    await ScoreDetailsModel.create({
        roundNumber: 3,
        teamOne: { userId: userOneId },
        teamTwo: { userId: userTwoId }
    });
}

describe('getRiderStatistics', () => {
    test('Should reject a nonexistent statistics season', async () => {
        const invalidId = new mongoose.Types.ObjectId().toString();
        await expect(
            getRiderStatistics({ seasonId: invalidId, stage: 'regularSeason' })
        ).rejects.toThrow(`Invalid seasonId: ${invalidId}`);
    });
    test('Should reject an unsupported statistics stage', async () => {
        await expect(
            getRiderStatistics({
                seasonId,
                stage: 'grandPrix' as StatisticsStageType
            })
        ).rejects.toThrow('Invalid stage: grandPrix');
    });
    test.each([
        {
            stage: 'regularSeason' as const,
            roundFrom: 0,
            roundTo: 14,
            maximum: 14
        },
        { stage: 'playoff' as const, roundFrom: 1, roundTo: 5, maximum: 4 },
        {
            stage: 'regularSeason' as const,
            roundFrom: 3,
            roundTo: 2,
            maximum: 14
        }
    ])(
        'Should reject the $stage round range $roundFrom - $roundTo',
        async ({ stage, roundFrom, roundTo, maximum }) => {
            await expect(
                getRiderStatistics({ seasonId, stage, roundFrom, roundTo })
            ).rejects.toThrow(
                `Invalid round range: ${roundFrom} - ${roundTo}. Must be between 1 and ${maximum}`
            );
        }
    );
    test('Should pool signed rider points and real starts across users while counting each match observation once', async () => {
        await seedScoredMatches();
        await PlayersModel.updateOne(
            { _id: playerIds[0] },
            { playerStatus: 'inactive' }
        );
        const statistics = await getRiderStatistics({
            seasonId,
            stage: 'regularSeason'
        });
        expect(
            statistics.find(player => player.playerId === playerIds[0])
        ).toEqual({
            playerId: playerIds[0],
            extraligaPlayerName: 'Rider 0',
            basePoints: 21,
            functionPoints: 2,
            rolePoints: 3,
            setPlayPoints: 1,
            totalPoints: 27,
            appearanceCount: 4,
            actualStartCount: 7,
            pointsPerMatch: 6.75,
            pointsPerHeat: 27 / 7,
            functionAssignmentCounts: { Lider: 2, Joker: 1, Kapitan: 1 },
            roleAssignmentCounts: { PN: 1, KB: 1, P: 1 },
            userCount: 2,
            roundCount: 2
        });
        expect(
            statistics.find(
                player =>
                    player.playerId === playerIds[STARTING_LINEUP_PLAYER_COUNT]
            )
        ).toMatchObject({
            totalPoints: 0,
            appearanceCount: 0,
            actualStartCount: 0,
            pointsPerMatch: null,
            pointsPerHeat: null
        });
    });
    test('Should restrict personal rider points to the requested user and round range and retain unscored roster riders', async () => {
        await seedScoredMatches();
        const result = await getRiderStatistics({
            seasonId,
            stage: 'regularSeason',
            userId: userOneId,
            roundFrom: 2,
            roundTo: 2
        });
        expect(
            result.find(player => player.playerId === playerIds[0])
        ).toMatchObject({
            totalPoints: 9,
            appearanceCount: 1,
            actualStartCount: 2,
            pointsPerMatch: 9,
            pointsPerHeat: 4.5,
            functionAssignmentCounts: { Lider: 1, Joker: 0, Kapitan: 0 },
            roleAssignmentCounts: { PN: 0, KB: 0, P: 0 },
            userCount: 1,
            roundCount: 1
        });
        expect(
            result.find(
                player =>
                    player.playerId === playerIds[STARTING_LINEUP_PLAYER_COUNT]
            )
        ).toMatchObject({
            appearanceCount: 0,
            pointsPerMatch: null,
            pointsPerHeat: null
        });
    });
    test('Should retain signed points and a scored appearance when the rider has no real starts', async () => {
        const details = createDetails();
        details.players[0].setPlayPoints = -2;
        details.floorAdjustment = 2;
        await ScoreDetailsModel.create({
            scheduleId: new mongoose.Types.ObjectId(),
            roundNumber: 1,
            teamOne: { userId: userOneId, calculationDetails: details },
            teamTwo: { userId: userTwoId, calculationDetails: createDetails() }
        });
        const result = await getRiderStatistics({
            seasonId,
            stage: 'regularSeason',
            userId: userOneId
        });
        expect(
            result.find(player => player.playerId === playerIds[0])
        ).toMatchObject({
            totalPoints: -2,
            appearanceCount: 1,
            actualStartCount: 0,
            pointsPerMatch: -2,
            pointsPerHeat: null
        });
    });
    test('Should return unavailable rates for eligible riders when no matches have been calculated', async () => {
        const result = await getRiderStatistics({
            seasonId,
            stage: 'regularSeason'
        });
        expect(result).toHaveLength(STARTING_LINEUP_PLAYER_COUNT + 1);
        expect(result[0]).toMatchObject({
            totalPoints: 0,
            appearanceCount: 0,
            pointsPerMatch: null,
            pointsPerHeat: null
        });
    });
    test('Should use playoff results without including regular-season observations or falling back to them', async () => {
        await seedScoredMatches();
        const empty = await getRiderStatistics({ seasonId, stage: 'playoff' });
        expect(
            empty.find(player => player.playerId === playerIds[0])
                ?.appearanceCount
        ).toBe(0);
        const details = createDetails();
        Object.assign(details.players[0], {
            basePoints: 8,
            actualStartCount: 2
        });
        await ScoreDetailsPlayoffModel.create({
            scheduleId: new mongoose.Types.ObjectId(),
            roundNumber: 1,
            teamOne: { userId: userOneId, calculationDetails: details },
            teamTwo: { userId: userTwoId, calculationDetails: createDetails() }
        });
        const result = await getRiderStatistics({
            seasonId,
            stage: 'playoff',
            userId: userOneId
        });
        expect(
            result.find(player => player.playerId === playerIds[0])
        ).toMatchObject({
            totalPoints: 8,
            appearanceCount: 1,
            pointsPerHeat: 4
        });
    });
    test('Should use recorded historical ownership and stable user IDs while filtering season and stage and deduplicating archived matches', async () => {
        const archivedSeasonId = await seedArchivedMatches();
        await PlayersModel.updateOne(
            { _id: playerIds[STARTING_LINEUP_PLAYER_COUNT] },
            { playoffUserId: userOneId }
        );
        await UserModel.deleteMany();
        await PlayersModel.updateOne(
            { _id: playerIds[0] },
            {
                playerStatus: 'inactive',
                dolceUserId: new mongoose.Types.ObjectId()
            }
        );
        const regular = await getRiderStatistics({
            seasonId: archivedSeasonId,
            stage: 'regularSeason',
            userId: userOneId
        });
        expect(
            regular.find(player => player.playerId === playerIds[0])
        ).toMatchObject({
            totalPoints: 5,
            appearanceCount: 1,
            actualStartCount: 2,
            pointsPerHeat: 2.5
        });
        expect(regular.map(player => player.playerId)).not.toContain(
            playerIds[STARTING_LINEUP_PLAYER_COUNT]
        );
        const playoff = await getRiderStatistics({
            seasonId: archivedSeasonId,
            stage: 'playoff',
            userId: userOneId
        });
        expect(
            playoff.find(player => player.playerId === playerIds[0])
        ).toMatchObject({
            totalPoints: 8,
            appearanceCount: 1,
            actualStartCount: 2,
            pointsPerHeat: 4
        });
        expect(playoff.map(player => player.playerId)).not.toContain(
            playerIds[STARTING_LINEUP_PLAYER_COUNT]
        );
    });
    test('Should read live and archived rider statistics without recalculating or changing saved scores', async () => {
        await seedScoredMatches();
        const archivedSeasonId = await seedArchivedMatches();
        const before = await readStoredScores();
        const calculateMatchScores = jest.spyOn(
            scoreCalculationUtils,
            'calculateMatchScores'
        );
        try {
            for (const requestedSeasonId of [seasonId, archivedSeasonId]) {
                for (const stage of ['regularSeason', 'playoff'] as const) {
                    await getRiderStatistics({
                        seasonId: requestedSeasonId,
                        stage,
                        userId: userOneId
                    });
                }
            }
            expect(calculateMatchScores).not.toHaveBeenCalled();
            expect(await readStoredScores()).toEqual(before);
        } finally {
            calculateMatchScores.mockRestore();
        }
    });
});

describe('getTrainerStatistics', () => {
    test('Should reject a nonexistent statistics season', async () => {
        const invalidId = new mongoose.Types.ObjectId().toString();
        await expect(
            getTrainerStatistics({
                seasonId: invalidId,
                stage: 'regularSeason',
                userId: userOneId
            })
        ).rejects.toThrow(`Invalid seasonId: ${invalidId}`);
    });
    test('Should calculate only the requested trainer points using five heat slots per distinct match', async () => {
        await seedScoredMatches();
        expect(
            await getTrainerStatistics({
                seasonId,
                stage: 'regularSeason',
                userId: userOneId
            })
        ).toEqual({
            userId: userOneId,
            teamName: 'Team 0',
            coachName: 'Coach 0',
            heatPoints: 6,
            setPlayPoints: 2,
            totalPoints: 8,
            matchCount: 2,
            heatSlotCount: 10,
            pointsPerMatch: 4,
            pointsPerHeat: 0.8
        });
        expect(
            await getTrainerStatistics({
                seasonId,
                stage: 'regularSeason',
                userId: userTwoId
            })
        ).toMatchObject({
            totalPoints: 0,
            matchCount: 2,
            heatSlotCount: 10,
            pointsPerMatch: 0,
            pointsPerHeat: 0
        });
        expect(
            await getTrainerStatistics({
                seasonId,
                stage: 'regularSeason',
                userId: userOneId,
                roundFrom: 2,
                roundTo: 2
            })
        ).toMatchObject({
            heatPoints: 1,
            setPlayPoints: -2,
            totalPoints: -1,
            matchCount: 1,
            heatSlotCount: 5,
            pointsPerMatch: -1,
            pointsPerHeat: -0.2
        });
    });
    test('Should return unavailable trainer averages when no calculated matches exist', async () => {
        expect(
            await getTrainerStatistics({
                seasonId,
                stage: 'playoff',
                userId: userOneId
            })
        ).toMatchObject({
            totalPoints: 0,
            matchCount: 0,
            heatSlotCount: 0,
            pointsPerMatch: null,
            pointsPerHeat: null
        });
    });
    test('Should use archived trainer names and saved totals after the live user is removed', async () => {
        const archivedSeasonId = await seedArchivedMatches();
        await UserModel.deleteMany();
        expect(
            await getTrainerStatistics({
                seasonId: archivedSeasonId,
                stage: 'regularSeason',
                userId: userOneId
            })
        ).toMatchObject({
            userId: userOneId,
            teamName: 'Archive Team',
            coachName: 'Archive Coach',
            heatPoints: 3,
            setPlayPoints: 4,
            totalPoints: 7,
            matchCount: 1,
            heatSlotCount: 5,
            pointsPerMatch: 7,
            pointsPerHeat: 1.4
        });
    });
    test('Should read live and archived trainer statistics without recalculating or changing saved scores', async () => {
        await seedScoredMatches();
        const archivedSeasonId = await seedArchivedMatches();
        const before = await readStoredScores();
        const calculateMatchScores = jest.spyOn(
            scoreCalculationUtils,
            'calculateMatchScores'
        );
        try {
            for (const requestedSeasonId of [seasonId, archivedSeasonId]) {
                for (const stage of ['regularSeason', 'playoff'] as const) {
                    await getTrainerStatistics({
                        seasonId: requestedSeasonId,
                        stage,
                        userId: userOneId
                    });
                }
            }
            expect(calculateMatchScores).not.toHaveBeenCalled();
            expect(await readStoredScores()).toEqual(before);
        } finally {
            calculateMatchScores.mockRestore();
        }
    });
});

async function readStoredScores() {
    return Promise.all([
        ScoreDetailsModel.find().sort({ _id: 1 }).lean().exec(),
        ScoreDetailsPlayoffModel.find().sort({ _id: 1 }).lean().exec(),
        HistoryGamesScoreDetailsModel.find().sort({ _id: 1 }).lean().exec(),
        SeasonOpsModel.find().sort({ _id: 1 }).lean().exec()
    ]);
}

async function seedArchivedMatches() {
    const season = await SeasonOpsModel.create({
        name: '2024',
        isCurrentSeason: false,
        numberOfGroups: 1
    });
    const archiveId = season._id.toString();
    const [teamOne, teamTwo] = await HistoryTeamModel.create([
        {
            historyId: season._id,
            name: 'Archive Team',
            coachName: 'Archive Coach',
            logoUrl: 'https://example.com/archive.png'
        },
        {
            historyId: season._id,
            name: 'Archive Opponent',
            coachName: 'Archive Opponent Coach',
            logoUrl: 'https://example.com/archive-opponent.png'
        }
    ]);
    const regularDetails = createDetails();
    Object.assign(regularDetails.players[0], {
        basePoints: 5,
        actualStartCount: 2
    });
    regularDetails.trainer = { heatPoints: 3, setPlayPoints: 4 };
    const playoffDetails = createDetails();
    Object.assign(playoffDetails.players[0], {
        basePoints: 8,
        actualStartCount: 2
    });
    const [regular, playoff] = await HistoryGamesScoreDetailsModel.create([
        {
            teamOne: {
                teamId: teamOne._id,
                userId: userOneId,
                score: 12,
                calculationDetails: regularDetails
            },
            teamTwo: {
                teamId: teamTwo._id,
                userId: userTwoId,
                score: 0,
                calculationDetails: createDetails()
            }
        },
        {
            teamOne: {
                teamId: teamOne._id,
                userId: userOneId,
                score: 8,
                calculationDetails: playoffDetails
            },
            teamTwo: {
                teamId: teamTwo._id,
                userId: userTwoId,
                score: 0,
                calculationDetails: createDetails()
            }
        }
    ]);
    const baseGame = {
        roundNumber: 1,
        teamOne: { teamId: teamOne._id, score: 12 },
        teamTwo: { teamId: teamTwo._id, score: 0 }
    };
    const regularGame = {
        ...baseGame,
        stage: 'regularSeason',
        scoreDetails: regular._id
    };
    await HistoryGamesModel.create([
        {
            season: season._id,
            games: [
                regularGame,
                { ...baseGame, stage: 'playoff', scoreDetails: playoff._id }
            ]
        },
        { season: season._id, games: [regularGame] }
    ]);
    const otherSeason = await SeasonOpsModel.create({
        name: '2023',
        isCurrentSeason: false,
        numberOfGroups: 1
    });
    const otherDetails = createDetails();
    Object.assign(otherDetails.players[0], {
        basePoints: 88,
        actualStartCount: 1
    });
    const other = await HistoryGamesScoreDetailsModel.create({
        teamOne: {
            teamId: teamOne._id,
            userId: userOneId,
            score: 88,
            calculationDetails: otherDetails
        },
        teamTwo: {
            teamId: teamTwo._id,
            userId: userTwoId,
            score: 0,
            calculationDetails: createDetails()
        }
    });
    await HistoryGamesModel.create({
        season: otherSeason._id,
        games: [{ ...regularGame, scoreDetails: other._id }]
    });
    const live = createDetails();
    Object.assign(live.players[0], { basePoints: 40, actualStartCount: 5 });
    await ScoreDetailsModel.create({
        scheduleId: new mongoose.Types.ObjectId(),
        roundNumber: 1,
        teamOne: { userId: userOneId, calculationDetails: live },
        teamTwo: { userId: userTwoId, calculationDetails: createDetails() }
    });
    return archiveId;
}
