import type {
    AggregateRiderStatisticsParamsType,
    AggregateTrainerStatisticsParamsType,
    RiderStatisticsAccumulatorType,
    RiderStatisticsReturnType,
    TrainerStatisticsReturnType,
    GetMatchDataStatisticsParamsType,
    StatisticsRoundRangeType,
    SetPlayStatisticsReturnType,
    AggregateSetPlayStatisticsParamsType,
    SetPlayStatisticsAccumulatorType,
    SetPlayStatisticsSummaryType,
    SetPlayStatisticsRoundSeriesType,
    AddSetPlayResultToStatisticsParamsType,
    SummarizeSetPlayStatisticsParamsType,
    GetLatestStatisticsRoundParamsType,
    GetTrendStatisticsParamsType,
    StatisticsTrendType,
    GetPointsTrendStatisticsParamsType,
    StatisticsPointsTrendType,
    BuildStatisticsRoundSeriesParamsType,
    StatisticsRoundSeriesType,
    StatisticsRoundTotalsType
} from '@/db/statistics.types';

import {
    STATISTICS_POINTS_AVERAGE_DECIMALS,
    STATISTICS_POINTS_PER_HEAT_DECIMALS,
    CALCULATION_FUNCTIONS,
    CALCULATION_ROLES,
    STARTING_LINEUP_PLAYER_COUNT,
    MIN_REGULAR_SEASON_ROUND,
    MAX_REGULAR_SEASON_ROUND,
    MIN_PLAYOFF_ROUND,
    MAX_PLAYOFF_ROUND
} from '@/db/db.constants';
import { SetPlayEnumType, objectIdSchema } from '@/db/models/schema.types';

export function validateRoundRangeAndStageStatistics(
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
    const roundTo = getLatestStatisticsRound(params);
    const riders = new Map<string, RiderStatisticsAccumulatorType>();
    for (const rider of params.riders) {
        riders.set(rider.playerId, {
            result: {
                ...rider,
                basePoints: 0,
                functionPoints: 0,
                rolePoints: 0,
                setPlayPoints: 0,
                trend: getPointsTrendStatistics({
                    roundTotals: new Map(),
                    roundFrom: params.roundFrom,
                    roundTo,
                    totalPoints: 0,
                    appearanceCount: 0,
                    actualStartCount: 0
                }),
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
            rounds: new Set(),
            roundTotals: new Map()
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
                const round = rider.roundTotals.get(match.roundNumber) ?? {
                    totalPoints: 0,
                    appearanceCount: 0,
                    actualStartCount: 0
                };
                round.totalPoints +=
                    player.basePoints +
                    player.functionPoints +
                    player.rolePoints +
                    player.setPlayPoints;
                round.appearanceCount++;
                round.actualStartCount += player.actualStartCount;
                rider.roundTotals.set(match.roundNumber, round);
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
            trend: getPointsTrendStatistics({
                roundTotals: rider.roundTotals,
                roundFrom: params.roundFrom,
                roundTo,
                totalPoints: result.totalPoints,
                appearanceCount: result.appearanceCount,
                actualStartCount: result.actualStartCount
            }),
            ...(params.userId
                ? {
                      roundSeries: buildStatisticsRoundSeries({
                          roundTotals: rider.roundTotals,
                          roundFrom: params.roundFrom,
                          roundTo
                      })
                  }
                : {}),
            userCount: rider.userIds.size,
            roundCount: rider.rounds.size
        };
    });
}

export function aggregateTrainerStatistics(
    params: AggregateTrainerStatisticsParamsType
): TrainerStatisticsReturnType {
    const roundTo = getLatestStatisticsRound(params);
    const roundTotals = new Map<number, StatisticsRoundTotalsType>();
    const result: TrainerStatisticsReturnType = {
        trend: getPointsTrendStatistics({
            roundTotals,
            roundFrom: params.roundFrom,
            roundTo,
            totalPoints: 0,
            appearanceCount: 0,
            actualStartCount: 0
        }),
        roundSeries: [],
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
            const round = roundTotals.get(match.roundNumber) ?? {
                totalPoints: 0,
                appearanceCount: 0,
                actualStartCount: 0
            };
            round.totalPoints +=
                team.calculationDetails.trainer.heatPoints +
                team.calculationDetails.trainer.setPlayPoints;
            round.appearanceCount++;
            round.actualStartCount += STARTING_LINEUP_PLAYER_COUNT;
            roundTotals.set(match.roundNumber, round);
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
    result.trend = getPointsTrendStatistics({
        roundTotals,
        roundFrom: params.roundFrom,
        roundTo,
        totalPoints: result.totalPoints,
        appearanceCount: result.matchCount,
        actualStartCount: result.heatSlotCount
    });
    result.roundSeries = buildStatisticsRoundSeries({
        roundTotals,
        roundFrom: params.roundFrom,
        roundTo
    }).map(round => {
        const { appearanceCount, actualStartCount, ...values } = round;
        return {
            ...values,
            matchCount: appearanceCount,
            heatSlotCount: actualStartCount
        };
    });
    return result;
}

function getTrendStatistics(
    params: GetTrendStatisticsParamsType
): StatisticsTrendType {
    const currentAverage =
        params.currentExposure > 0
            ? params.currentPoints / params.currentExposure
            : null;
    const previousAverage =
        params.previousExposure > 0
            ? params.previousPoints / params.previousExposure
            : null;
    const delta =
        currentAverage !== null && previousAverage !== null
            ? currentAverage - previousAverage
            : null;
    const displayedDelta =
        delta === null ? null : Number(delta.toFixed(params.decimalPlaces));
    let direction: StatisticsTrendType['direction'] = null;
    if (displayedDelta !== null) {
        if (displayedDelta > 0) {
            direction = 'up';
        } else if (displayedDelta < 0) {
            direction = 'down';
        } else {
            direction = 'stable';
        }
    }
    return {
        current: {
            roundFrom: params.roundFrom,
            roundTo: params.roundTo,
            totalPoints: params.currentPoints,
            exposureCount: params.currentExposure,
            average: currentAverage
        },
        previous: {
            roundFrom: params.roundFrom,
            roundTo:
                params.roundTo !== null && params.roundTo > params.roundFrom
                    ? params.roundTo - 1
                    : null,
            totalPoints: params.previousPoints,
            exposureCount: params.previousExposure,
            average: previousAverage
        },
        delta,
        direction
    };
}

function getPointsTrendStatistics(
    params: GetPointsTrendStatisticsParamsType
): StatisticsPointsTrendType {
    const latest =
        params.roundTo === null
            ? undefined
            : params.roundTotals.get(params.roundTo);
    const previousPoints = params.totalPoints - (latest?.totalPoints ?? 0);
    return {
        pointsPerMatch: getTrendStatistics({
            roundFrom: params.roundFrom,
            roundTo: params.roundTo,
            currentPoints: params.totalPoints,
            currentExposure: params.appearanceCount,
            previousPoints,
            previousExposure:
                params.appearanceCount - (latest?.appearanceCount ?? 0),
            decimalPlaces: STATISTICS_POINTS_AVERAGE_DECIMALS
        }),
        pointsPerHeat: getTrendStatistics({
            roundFrom: params.roundFrom,
            roundTo: params.roundTo,
            currentPoints: params.totalPoints,
            currentExposure: params.actualStartCount,
            previousPoints,
            previousExposure:
                params.actualStartCount - (latest?.actualStartCount ?? 0),
            decimalPlaces: STATISTICS_POINTS_PER_HEAT_DECIMALS
        })
    };
}

function buildStatisticsRoundSeries(
    params: BuildStatisticsRoundSeriesParamsType
): StatisticsRoundSeriesType[] {
    const result: StatisticsRoundSeriesType[] = [];
    let totalPoints = 0;
    let appearanceCount = 0;
    let actualStartCount = 0;
    if (params.roundTo === null) {
        return result;
    }
    for (
        let roundNumber = params.roundFrom;
        roundNumber <= params.roundTo;
        roundNumber++
    ) {
        const round = params.roundTotals.get(roundNumber);
        totalPoints += round?.totalPoints ?? 0;
        appearanceCount += round?.appearanceCount ?? 0;
        actualStartCount += round?.actualStartCount ?? 0;
        result.push({
            roundNumber,
            totalPoints: round?.totalPoints ?? null,
            appearanceCount: round?.appearanceCount ?? 0,
            actualStartCount: round?.actualStartCount ?? 0,
            pointsPerMatch:
                round && round.appearanceCount > 0
                    ? round.totalPoints / round.appearanceCount
                    : null,
            pointsPerHeat:
                round && round.actualStartCount > 0
                    ? round.totalPoints / round.actualStartCount
                    : null,
            cumulativePointsPerMatch:
                appearanceCount > 0 ? totalPoints / appearanceCount : null,
            cumulativePointsPerHeat:
                actualStartCount > 0 ? totalPoints / actualStartCount : null
        });
    }
    return result;
}

function getLatestStatisticsRound(
    params: GetLatestStatisticsRoundParamsType
): number | null {
    return params.matches.length
        ? Math.max(...params.matches.map(match => match.roundNumber))
        : null;
}

function createSetPlayStatisticsAccumulator(): SetPlayStatisticsAccumulatorType {
    return {
        totalPoints: 0,
        useCount: 0,
        positiveReturnCount: 0,
        zeroReturnCount: 0,
        negativeReturnCount: 0,
        matchIds: new Set(),
        userIds: new Set(),
        rounds: new Set(),
        roundTotals: new Map()
    };
}

function addSetPlayResultToStatistics(
    params: AddSetPlayResultToStatisticsParamsType
): void {
    const accumulator = params.accumulator;
    accumulator.totalPoints += params.points;
    accumulator.useCount++;
    if (params.points > 0) {
        accumulator.positiveReturnCount++;
    } else if (params.points < 0) {
        accumulator.negativeReturnCount++;
    } else {
        accumulator.zeroReturnCount++;
    }
    accumulator.matchIds.add(
        `${params.match.seasonId}:${params.match.stage}:${params.match.matchId}:${params.userId}`
    );
    accumulator.userIds.add(params.userId);
    accumulator.rounds.add(params.match.roundNumber);
    const round = accumulator.roundTotals.get(params.match.roundNumber) ?? {
        totalPoints: 0,
        useCount: 0
    };
    round.totalPoints += params.points;
    round.useCount++;
    accumulator.roundTotals.set(params.match.roundNumber, round);
}

function summarizeSetPlayStatistics(
    params: SummarizeSetPlayStatisticsParamsType
): SetPlayStatisticsSummaryType {
    const accumulator = params.accumulator;
    const latest =
        params.roundTo === null
            ? undefined
            : accumulator.roundTotals.get(params.roundTo);
    const roundSeries: SetPlayStatisticsRoundSeriesType[] = [];
    let totalPoints = 0;
    let useCount = 0;
    if (params.roundTo !== null) {
        for (
            let roundNumber = params.roundFrom;
            roundNumber <= params.roundTo;
            roundNumber++
        ) {
            const round = accumulator.roundTotals.get(roundNumber);
            totalPoints += round?.totalPoints ?? 0;
            useCount += round?.useCount ?? 0;
            roundSeries.push({
                roundNumber,
                totalPoints: round?.totalPoints ?? null,
                useCount: round?.useCount ?? 0,
                pointsPerUse:
                    round && round.useCount > 0
                        ? round.totalPoints / round.useCount
                        : null,
                cumulativePointsPerUse:
                    useCount > 0 ? totalPoints / useCount : null
            });
        }
    }
    return {
        totalPoints: accumulator.totalPoints,
        useCount: accumulator.useCount,
        usedMatchCount: accumulator.matchIds.size,
        pointsPerUse:
            accumulator.useCount > 0
                ? accumulator.totalPoints / accumulator.useCount
                : null,
        pointsPerUsedMatch:
            accumulator.matchIds.size > 0
                ? accumulator.totalPoints / accumulator.matchIds.size
                : null,
        positiveReturnCount: accumulator.positiveReturnCount,
        zeroReturnCount: accumulator.zeroReturnCount,
        negativeReturnCount: accumulator.negativeReturnCount,
        userCount: accumulator.userIds.size,
        roundCount: accumulator.rounds.size,
        trend: getTrendStatistics({
            roundFrom: params.roundFrom,
            roundTo: params.roundTo,
            currentPoints: accumulator.totalPoints,
            currentExposure: accumulator.useCount,
            previousPoints:
                accumulator.totalPoints - (latest?.totalPoints ?? 0),
            previousExposure: accumulator.useCount - (latest?.useCount ?? 0),
            decimalPlaces: STATISTICS_POINTS_AVERAGE_DECIMALS
        }),
        roundSeries
    };
}

export function aggregateSetPlayStatistics(
    params: AggregateSetPlayStatisticsParamsType
): SetPlayStatisticsReturnType[] {
    const setPlays = new Map(
        params.setPlays.map(setPlay => [setPlay.type, setPlay])
    );
    const league = new Map<SetPlayEnumType, SetPlayStatisticsAccumulatorType>();
    const personal = new Map<
        SetPlayEnumType,
        SetPlayStatisticsAccumulatorType
    >();
    const observations = new Set<string>();
    const roundTo = getLatestStatisticsRound(params);
    for (const match of params.matches) {
        for (const team of [match.teamOne, match.teamTwo]) {
            for (const setPlay of team.calculationDetails.setPlayResults) {
                const key = `${match.seasonId}:${match.stage}:${match.matchId}:${team.userId}:${setPlay.selectedSetPlayId}`;
                if (observations.has(key)) {
                    continue;
                }
                observations.add(key);
                const points = setPlay.recipients.reduce(
                    (total, recipient) => total + recipient.creditedPoints,
                    0
                );
                const leagueResult =
                    league.get(setPlay.type) ??
                    createSetPlayStatisticsAccumulator();
                addSetPlayResultToStatistics({
                    accumulator: leagueResult,
                    match,
                    userId: team.userId,
                    points
                });
                league.set(setPlay.type, leagueResult);
                if (team.userId === params.userId) {
                    const personalResult =
                        personal.get(setPlay.type) ??
                        createSetPlayStatisticsAccumulator();
                    addSetPlayResultToStatistics({
                        accumulator: personalResult,
                        match,
                        userId: team.userId,
                        points
                    });
                    personal.set(setPlay.type, personalResult);
                }
            }
        }
    }
    return [...setPlays.values()].map(setPlay => {
        return {
            ...setPlay,
            personal: params.userId
                ? summarizeSetPlayStatistics({
                      accumulator:
                          personal.get(setPlay.type) ??
                          createSetPlayStatisticsAccumulator(),
                      roundFrom: params.roundFrom,
                      roundTo
                  })
                : null,
            league: summarizeSetPlayStatistics({
                accumulator:
                    league.get(setPlay.type) ??
                    createSetPlayStatisticsAccumulator(),
                roundFrom: params.roundFrom,
                roundTo
            })
        };
    });
}
