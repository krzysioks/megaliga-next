import type { PlayersType } from '@/db/models/players';
import type {
    GetMatchDataStatisticsParamsType,
    GetTrainerStatisticsParamsType,
    GetDraftRiderStatisticsParamsType,
    DraftRiderStatisticsReturnType,
    LoadMatchDataStatisticsReturnType,
    RiderStatisticsReturnType,
    TrainerStatisticsReturnType,
    SetPlayStatisticsReturnType
} from '@/db/statistics.types';
import type { FilterQuery } from 'mongoose';

import ScoreDetailsModel from '@/db/models/games/score-details';
import ScoreDetailsPlayoffModel from '@/db/models/games/score-details-playoff';
import HistoryGamesModel from '@/db/models/history/history-games';
import PlayersModel from '@/db/models/players';
import { objectIdSchema } from '@/db/models/schema.types';
import SeasonOpsModel from '@/db/models/season-ops';
import SetPlaysModel from '@/db/models/set-plays';
import UserModel from '@/db/models/user';
import {
    aggregateRiderStatistics,
    aggregateTrainerStatistics,
    aggregateSetPlayStatistics,
    validateRoundRangeAndStageStatistics
} from '@/db/statistics.utils';

async function loadMatchDataStatistics(
    params: GetMatchDataStatisticsParamsType
): Promise<LoadMatchDataStatisticsReturnType> {
    const range = validateRoundRangeAndStageStatistics(params);
    const season = await SeasonOpsModel.findById(params.seasonId)
        .select('isCurrentSeason')
        .exec();
    if (!season) {
        throw new Error(`Invalid seasonId: ${params.seasonId}`);
    }
    if (season.isCurrentSeason && params.userId !== undefined) {
        const userExists = await UserModel.exists({ _id: params.userId });
        if (!userExists) {
            throw new Error(`Invalid userId: ${params.userId}`);
        }
    }

    // Use the league's latest calculated round even when this user has no match in it.
    const leagueParams = { ...params, userId: undefined };
    if (!season.isCurrentSeason) {
        return {
            matches:
                await HistoryGamesModel.getMatchDataStatistics(leagueParams),
            roundFrom: range.roundFrom,
            isCurrentSeason: false
        };
    }
    const matches =
        params.stage === 'regularSeason'
            ? await ScoreDetailsModel.getMatchDataStatistics(leagueParams)
            : await ScoreDetailsPlayoffModel.getMatchDataStatistics(
                  leagueParams
              );
    return { matches, roundFrom: range.roundFrom, isCurrentSeason: true };
}

export async function getRiderStatistics(
    params: GetMatchDataStatisticsParamsType
): Promise<RiderStatisticsReturnType[]> {
    const matchDataStatistics = await loadMatchDataStatistics(params);
    const playerIds = new Set<string>();
    for (const match of matchDataStatistics.matches) {
        for (const team of [match.teamOne, match.teamTwo]) {
            if (!params.userId || team.userId === params.userId) {
                for (const player of team.calculationDetails.players) {
                    playerIds.add(player.playerId);
                }
            }
        }
    }
    const queries: FilterQuery<PlayersType>[] = [
        { _id: { $in: [...playerIds] } }
    ];
    if (!params.userId) {
        queries.push({ playerStatus: 'active' });
    } else if (matchDataStatistics.isCurrentSeason) {
        queries.push(
            ...(params.stage === 'playoff'
                ? [{ playoffUserId: params.userId }]
                : [
                      { dolceUserId: params.userId },
                      { gabbanaUserId: params.userId }
                  ])
        );
    }
    const players = await PlayersModel.find({ $or: queries })
        .select('extraligaPlayerName')
        .sort({ extraligaPlayerName: 1 })
        .exec();
    const riders = players.map(player => {
        return {
            playerId: player._id.toString(),
            extraligaPlayerName: player.extraligaPlayerName
        };
    });
    return aggregateRiderStatistics({
        matches: matchDataStatistics.matches,
        roundFrom: matchDataStatistics.roundFrom,
        riders,
        userId: params.userId
    });
}

export async function getTrainerStatistics(
    params: GetTrainerStatisticsParamsType
): Promise<TrainerStatisticsReturnType> {
    objectIdSchema.unwrap().parse(params.userId);
    const matchDataStatistics = await loadMatchDataStatistics(params);
    return aggregateTrainerStatistics({
        matches: matchDataStatistics.matches,
        roundFrom: matchDataStatistics.roundFrom,
        userId: params.userId
    });
}

export async function getSetPlayStatistics(
    params: GetMatchDataStatisticsParamsType
): Promise<SetPlayStatisticsReturnType[]> {
    const matchDataStatistics = await loadMatchDataStatistics(params);
    const documents = await SetPlaysModel.find().select('name type').exec();
    const setPlays = documents.map(document => {
        return { name: document.name, type: document.type };
    });
    return aggregateSetPlayStatistics({
        matches: matchDataStatistics.matches,
        roundFrom: matchDataStatistics.roundFrom,
        setPlays,
        userId: params.userId
    });
}

export async function getDraftRiderStatistics(
    params: GetDraftRiderStatisticsParamsType
): Promise<DraftRiderStatisticsReturnType[]> {
    const matchParams = {
        seasonId: params.previousSeasonId,
        stage: params.stage
    };
    const range = validateRoundRangeAndStageStatistics(matchParams);
    const season = await SeasonOpsModel.findById(params.previousSeasonId)
        .select('isCurrentSeason')
        .exec();
    if (!season) {
        throw new Error(`Invalid seasonId: ${params.previousSeasonId}`);
    }
    if (season.isCurrentSeason) {
        throw new Error(
            `Draft statistics require a historical season: ${params.previousSeasonId}`
        );
    }
    const matches = await HistoryGamesModel.getMatchDataStatistics(matchParams);
    const playerIds = [...new Set(params.playerIds)];
    const riders = playerIds.map(playerId => {
        return { playerId, extraligaPlayerName: '' };
    });
    const riderStatistics = aggregateRiderStatistics({
        matches,
        riders,
        roundFrom: range.roundFrom
    });
    return riderStatistics.map(riderStatistic => {
        return {
            playerId: riderStatistic.playerId,
            statistics:
                riderStatistic.appearanceCount > 0
                    ? {
                          totalPoints: riderStatistic.totalPoints,
                          appearanceCount: riderStatistic.appearanceCount,
                          actualStartCount: riderStatistic.actualStartCount,
                          pointsPerHeat: riderStatistic.pointsPerHeat
                      }
                    : null
        };
    });
}
