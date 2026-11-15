import type {
    AggregateRiderStatisticsParamsType,
    AggregateTrainerStatisticsParamsType,
    RiderStatisticsAccumulatorType,
    RiderStatisticsReturnType,
    TrainerStatisticsReturnType,
    GetMatchDataStatisticsParamsType,
    StatisticsRoundRangeType
} from '@/db/statistics.types';

import {
    CALCULATION_FUNCTIONS,
    CALCULATION_ROLES,
    STARTING_LINEUP_PLAYER_COUNT,
    MIN_REGULAR_SEASON_ROUND,
    MAX_REGULAR_SEASON_ROUND,
    MIN_PLAYOFF_ROUND,
    MAX_PLAYOFF_ROUND
} from '@/db/db.constants';
import { objectIdSchema } from '@/db/models/schema.types';

export function validateStatisticsRoundRangeAndStage(
    params: GetMatchDataStatisticsParamsType
): StatisticsRoundRangeType {
    if (params.stage !== 'regularSeason' && params.stage !== 'playoff') {
        throw new Error(`Invalid stage: ${params.stage}`);
    }
    objectIdSchema.unwrap().parse(params.seasonId);
    if (params.userId !== undefined) {
        objectIdSchema.unwrap().parse(params.userId);
    }
    const minimum =
        params.stage === 'regularSeason'
            ? MIN_REGULAR_SEASON_ROUND
            : MIN_PLAYOFF_ROUND;
    const maximum =
        params.stage === 'regularSeason'
            ? MAX_REGULAR_SEASON_ROUND
            : MAX_PLAYOFF_ROUND;
    const roundFrom = params.roundFrom ?? minimum;
    const roundTo = params.roundTo ?? maximum;
    if (
        !Number.isInteger(roundFrom) ||
        !Number.isInteger(roundTo) ||
        roundFrom < minimum ||
        roundTo > maximum ||
        roundFrom > roundTo
    ) {
        throw new Error(
            `Invalid round range: ${roundFrom} - ${roundTo}. Must be between ${minimum} and ${maximum}`
        );
    }
    return { roundFrom, roundTo };
}

export function aggregateRiderStatistics(
    params: AggregateRiderStatisticsParamsType
): RiderStatisticsReturnType[] {
    const riders = new Map<string, RiderStatisticsAccumulatorType>();
    for (const rider of params.riders) {
        riders.set(rider.playerId, {
            result: {
                ...rider,
                basePoints: 0,
                functionPoints: 0,
                rolePoints: 0,
                setPlayPoints: 0,
                totalPoints: 0,
                appearanceCount: 0,
                actualStartCount: 0,
                pointsPerMatch: null,
                pointsPerHeat: null,
                functionAssignmentCounts: Object.fromEntries(
                    CALCULATION_FUNCTIONS.map(name => [name, 0])
                ) as RiderStatisticsReturnType['functionAssignmentCounts'],
                roleAssignmentCounts: Object.fromEntries(
                    CALCULATION_ROLES.map(name => [name, 0])
                ) as RiderStatisticsReturnType['roleAssignmentCounts'],
                userCount: 0,
                roundCount: 0
            },
            userIds: new Set(),
            rounds: new Set()
        });
    }
    const observations = new Set<string>();
    for (const match of params.matches) {
        for (const team of [match.teamOne, match.teamTwo]) {
            if (params.userId && team.userId !== params.userId) {
                continue;
            }
            for (const player of team.calculationDetails.players) {
                const key = `${match.seasonId}:${match.stage}:${match.matchId}:${team.userId}:${player.playerId}`;
                if (observations.has(key)) {
                    continue;
                }
                observations.add(key);
                const rider = riders.get(player.playerId);
                if (!rider) {
                    continue;
                }
                const result = rider.result;
                result.basePoints += player.basePoints;
                result.functionPoints += player.functionPoints;
                result.rolePoints += player.rolePoints;
                result.setPlayPoints += player.setPlayPoints;
                result.totalPoints +=
                    player.basePoints +
                    player.functionPoints +
                    player.rolePoints +
                    player.setPlayPoints;
                result.appearanceCount++;
                result.actualStartCount += player.actualStartCount;
                if (player.function) {
                    result.functionAssignmentCounts[player.function]++;
                }
                if (player.role) {
                    result.roleAssignmentCounts[player.role]++;
                }
                rider.userIds.add(team.userId);
                rider.rounds.add(match.roundNumber);
            }
        }
    }
    return [...riders.values()].map(rider => {
        const result = rider.result;
        return {
            ...result,
            pointsPerMatch:
                result.appearanceCount > 0
                    ? result.totalPoints / result.appearanceCount
                    : null,
            pointsPerHeat:
                result.actualStartCount > 0
                    ? result.totalPoints / result.actualStartCount
                    : null,
            userCount: rider.userIds.size,
            roundCount: rider.rounds.size
        };
    });
}

export function aggregateTrainerStatistics(
    params: AggregateTrainerStatisticsParamsType
): TrainerStatisticsReturnType {
    const result: TrainerStatisticsReturnType = {
        userId: params.userId,
        teamName: '',
        coachName: '',
        heatPoints: 0,
        setPlayPoints: 0,
        totalPoints: 0,
        matchCount: 0,
        heatSlotCount: 0,
        pointsPerMatch: null,
        pointsPerHeat: null
    };
    const observations = new Set<string>();
    for (const match of params.matches) {
        for (const team of [match.teamOne, match.teamTwo]) {
            if (team.userId !== params.userId) {
                continue;
            }
            const key = `${match.seasonId}:${match.stage}:${match.matchId}:${team.userId}`;
            if (observations.has(key)) {
                continue;
            }
            observations.add(key);
            result.teamName = team.teamName;
            result.coachName = team.coachName;
            result.heatPoints += team.calculationDetails.trainer.heatPoints;
            result.setPlayPoints +=
                team.calculationDetails.trainer.setPlayPoints;
            result.matchCount++;
        }
    }
    result.totalPoints = result.heatPoints + result.setPlayPoints;
    result.heatSlotCount = STARTING_LINEUP_PLAYER_COUNT * result.matchCount;
    result.pointsPerMatch =
        result.matchCount > 0 ? result.totalPoints / result.matchCount : null;
    result.pointsPerHeat =
        result.heatSlotCount > 0
            ? result.totalPoints / result.heatSlotCount
            : null;
    return result;
}
