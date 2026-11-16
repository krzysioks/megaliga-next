import type {
    TeamCalculationDetailsType,
    stageEnumSchema
} from '@/db/models/schema.types';
import type { SetPlaysType } from '@/db/models/set-plays';
import type { z } from 'zod';

export type StatisticsStageType = Extract<
    z.infer<typeof stageEnumSchema>,
    'regularSeason' | 'playoff'
>;

export interface GetMatchDataStatisticsParamsType {
    seasonId: string;
    stage: StatisticsStageType;
    userId?: string;
    roundFrom?: number;
    roundTo?: number;
}

export interface StatisticsRoundRangeType {
    roundFrom: number;
    roundTo: number;
}

export interface MatchTeamStatisticsType {
    userId: string;
    teamName: string;
    coachName: string;
    calculationDetails: TeamCalculationDetailsType;
}

export interface MatchDataStatisticsType {
    matchId: string;
    seasonId: string;
    stage: StatisticsStageType;
    roundNumber: number;
    teamOne: MatchTeamStatisticsType;
    teamTwo: MatchTeamStatisticsType;
}

export interface GetTrainerStatisticsParamsType extends GetMatchDataStatisticsParamsType {
    userId: string;
}

export interface GetDraftRiderStatisticsParamsType {
    previousSeasonId: string;
    stage: StatisticsStageType;
    playerIds: string[];
}

export type DraftRiderStatisticsSummaryType = Pick<
    RiderStatisticsReturnType,
    'totalPoints' | 'appearanceCount' | 'actualStartCount' | 'pointsPerHeat'
>;

export interface DraftRiderStatisticsReturnType {
    playerId: string;
    statistics: DraftRiderStatisticsSummaryType | null;
}

export interface StatisticsRiderType {
    playerId: string;
    extraligaPlayerName: string;
}

export interface RiderStatisticsReturnType extends StatisticsRiderType {
    basePoints: number;
    functionPoints: number;
    rolePoints: number;
    setPlayPoints: number;
    totalPoints: number;
    appearanceCount: number;
    actualStartCount: number;
    pointsPerMatch: number | null;
    pointsPerHeat: number | null;
    functionAssignmentCounts: Record<
        NonNullable<TeamCalculationDetailsType['players'][number]['function']>,
        number
    >;
    roleAssignmentCounts: Record<
        NonNullable<TeamCalculationDetailsType['players'][number]['role']>,
        number
    >;
    userCount: number;
    roundCount: number;
    trend: StatisticsPointsTrendType;
    roundSeries?: StatisticsRoundSeriesType[];
}

export interface TrainerStatisticsReturnType {
    userId: string;
    teamName: string;
    coachName: string;
    heatPoints: number;
    setPlayPoints: number;
    totalPoints: number;
    matchCount: number;
    heatSlotCount: number;
    pointsPerMatch: number | null;
    pointsPerHeat: number | null;
    trend: StatisticsPointsTrendType;
    roundSeries: TrainerStatisticsRoundSeriesType[];
}

export interface AggregateRiderStatisticsParamsType {
    matches: MatchDataStatisticsType[];
    riders: StatisticsRiderType[];
    roundFrom: number;
    userId?: string;
}

export interface RiderStatisticsAccumulatorType {
    result: RiderStatisticsReturnType;
    userIds: Set<string>;
    rounds: Set<number>;
    roundTotals: Map<number, StatisticsRoundTotalsType>;
}

export interface AggregateTrainerStatisticsParamsType {
    matches: MatchDataStatisticsType[];
    roundFrom: number;
    userId: string;
}

export interface LoadMatchDataStatisticsReturnType {
    roundFrom: number;
    matches: MatchDataStatisticsType[];
    isCurrentSeason: boolean;
}

export interface StatisticsAverageSnapshotType {
    roundFrom: number;
    roundTo: number | null;
    totalPoints: number;
    exposureCount: number;
    average: number | null;
}

export interface StatisticsTrendType {
    current: StatisticsAverageSnapshotType;
    previous: StatisticsAverageSnapshotType;
    delta: number | null;
    direction: 'up' | 'down' | 'stable' | null;
}

export interface StatisticsPointsTrendType {
    pointsPerMatch: StatisticsTrendType;
    pointsPerHeat: StatisticsTrendType;
}

export interface StatisticsRoundTotalsType {
    totalPoints: number;
    appearanceCount: number;
    actualStartCount: number;
}

export interface StatisticsRoundSeriesType extends Omit<
    StatisticsRoundTotalsType,
    'totalPoints'
> {
    totalPoints: number | null;
    roundNumber: number;
    pointsPerMatch: number | null;
    pointsPerHeat: number | null;
    cumulativePointsPerMatch: number | null;
    cumulativePointsPerHeat: number | null;
}

export interface BuildStatisticsRoundSeriesParamsType {
    roundTotals: Map<number, StatisticsRoundTotalsType>;
    roundFrom: number;
    roundTo: number | null;
}

export interface GetTrendStatisticsParamsType {
    roundFrom: number;
    roundTo: number | null;
    currentPoints: number;
    currentExposure: number;
    previousPoints: number;
    previousExposure: number;
    decimalPlaces: number;
}

export interface GetPointsTrendStatisticsParamsType extends BuildStatisticsRoundSeriesParamsType {
    totalPoints: number;
    appearanceCount: number;
    actualStartCount: number;
}

export interface SetPlayStatisticsSummaryType {
    totalPoints: number;
    useCount: number;
    usedMatchCount: number;
    pointsPerUse: number | null;
    pointsPerUsedMatch: number | null;
    positiveReturnCount: number;
    zeroReturnCount: number;
    negativeReturnCount: number;
    userCount: number;
    roundCount: number;
    trend: StatisticsTrendType;
    roundSeries: SetPlayStatisticsRoundSeriesType[];
}

export interface SetPlayStatisticsRoundSeriesType {
    roundNumber: number;
    totalPoints: number | null;
    useCount: number;
    pointsPerUse: number | null;
    cumulativePointsPerUse: number | null;
}

export interface SetPlayStatisticsReturnType extends SetPlaysType {
    personal: SetPlayStatisticsSummaryType | null;
    league: SetPlayStatisticsSummaryType;
}

export interface AggregateSetPlayStatisticsParamsType {
    matches: MatchDataStatisticsType[];
    setPlays: SetPlaysType[];
    roundFrom: number;
    userId?: string;
}

export interface SetPlayStatisticsAccumulatorType {
    totalPoints: number;
    useCount: number;
    positiveReturnCount: number;
    zeroReturnCount: number;
    negativeReturnCount: number;
    matchIds: Set<string>;
    userIds: Set<string>;
    rounds: Set<number>;
    roundTotals: Map<number, { totalPoints: number; useCount: number }>;
}

export interface SummarizeSetPlayStatisticsParamsType {
    accumulator: SetPlayStatisticsAccumulatorType;
    roundFrom: number;
    roundTo: number | null;
}

export interface AddSetPlayResultToStatisticsParamsType {
    accumulator: SetPlayStatisticsAccumulatorType;
    match: MatchDataStatisticsType;
    userId: string;
    points: number;
}

export interface GetLatestStatisticsRoundParamsType {
    matches: MatchDataStatisticsType[];
}

export interface TrainerStatisticsRoundSeriesType extends Omit<
    StatisticsRoundSeriesType,
    'appearanceCount' | 'actualStartCount'
> {
    matchCount: number;
    heatSlotCount: number;
}
