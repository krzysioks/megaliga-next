import type {
    TeamCalculationDetailsType,
    stageEnumSchema
} from '@/db/models/schema.types';
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
}

export interface AggregateRiderStatisticsParamsType {
    matches: MatchDataStatisticsType[];
    riders: StatisticsRiderType[];
    userId?: string;
}

export interface RiderStatisticsAccumulatorType {
    result: RiderStatisticsReturnType;
    userIds: Set<string>;
    rounds: Set<number>;
}

export interface AggregateTrainerStatisticsParamsType {
    matches: MatchDataStatisticsType[];
    userId: string;
}

export interface LoadMatchDataStatisticsReturnType {
    matches: MatchDataStatisticsType[];
    isCurrentSeason: boolean;
}
