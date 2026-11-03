import type {
    RegularSeasonPlayerScoreDetailsType,
    ScoreDetailsType
} from '@/db/models/games/score-details';
import type {
    SetPlaysDataForUserReturnType,
    SetPlaysDataSelectionReturnType,
    SetPlaysDataListByStartingLineupIdReturnType
} from '@/db/models/games/set-plays-data';
import type { StartingLineupType } from '@/db/models/games/starting-lineup';
import type { PlayersReturnType, PlayersType } from '@/db/models/players';

import mongoose from 'mongoose';
import { z } from 'zod';

import {
    SetPlayEnumType,
    heatScoresSchema,
    playerSchema
} from '@/db/models/schema.types';

export type ConnectType = Promise<void | typeof mongoose>;

export type MatchPairType = [userOneId: string, userTwoId: string];

export interface GetSetPlaysDetailsParamsType {
    setPlayList: SetPlaysDataListByStartingLineupIdReturnType['setPlayList'];
    roles?: StartingLineupType['roles'] | null;
}

export type GetSetPlaysDetailsReturnType = {
    roles: StartingLineupType['roles'] | null;
    setPlays: Pick<
        SetPlaysDataForUserReturnType,
        'name' | 'type' | 'userData'
    >[];
    setPlayPlayers: Pick<
        PlayersReturnType,
        'playerId' | 'extraligaPlayerName'
    >[];
    setPlayDescriptions: string;
};

export interface AreRoundScoresCompleteParamsType {
    documents: {
        teamOne: Pick<ScoreDetailsType['teamOne'], 'players'>;
        teamTwo: Pick<ScoreDetailsType['teamTwo'], 'players'>;
    }[];
}

export type PlayerScoreDetailsType = Omit<
    z.infer<typeof playerSchema>,
    'playerId' | 'comment' | 'setPlay'
>;

export type PlayerScoreDetailsInputType = z.input<typeof heatScoresSchema>;

export const DEFAULT_PLAYER_SCORE_DETAILS: PlayerScoreDetailsType =
    heatScoresSchema.parse({});

export type CalculationPlayerType = RegularSeasonPlayerScoreDetailsType & {
    playerId: string;
    isJunior: PlayersType['isJunior'];
    setPlay: number;
    comment?: string;
};

export interface CalculationTeamType {
    players: CalculationPlayerType[];
    startingLineup: Omit<StartingLineupType, 'userId' | 'roundNumber'>;
    setPlayList: SetPlaysDataListByStartingLineupIdReturnType['setPlayList'];
    replacementPlayers?: Pick<CalculationPlayerType, 'playerId' | 'isJunior'>[];
}

export interface CalculateMatchScoresParamsType {
    roundNumber: number;
    teamOne: CalculationTeamType;
    teamTwo: CalculationTeamType;
}

export interface CalculationTeamReturnType {
    players: CalculationPlayerType[];
    trainer: NonNullable<ScoreDetailsType['teamOne']['trainer']>;
}

export interface CalculateMatchScoresReturnType {
    teamOne: CalculationTeamReturnType;
    teamTwo: CalculationTeamReturnType;
    teamOneScore: number;
    teamTwoScore: number;
}

export interface CalculatePlayerParamsType {
    player: CalculationPlayerType;
}

export interface CalculateKapitanParamsType extends CalculatePlayerParamsType {
    opponentPlayer: CalculationPlayerType;
}

export interface CalculatePrimusNominatusParamsType extends CalculatePlayerParamsType {
    isDisabled: boolean;
}

export interface CalculateTrainerParamsType {
    players: CalculationPlayerType[];
}

export interface ScoreModifierType {
    name: string;
    points: number;
    countsTowardsLimit: boolean;
}

export interface SetPlayCalculationParamsType<T extends SetPlayEnumType> {
    setPlay: Extract<SetPlaysDataSelectionReturnType, { type: T }>;
    player: CalculationPlayerType;
}

export interface CalculateSpartacusParamsType extends CalculatePlayerParamsType {
    ownAverage: number;
    opponentAverage: number;
    opponentPlayer: CalculationPlayerType;
}

export interface CalculateMortalKombatComboParamsType {
    liderPoints: number;
}

export interface CalculationSlotType {
    player: CalculationPlayerType;
    nominalPlayerId: string;
    isReserve: boolean;
    replacementNames: string[];
    isMatchDraw?: boolean;
}

export interface CalculateReplacementParamsType {
    player: CalculationPlayerType;
    playerId: string;
    isJunior: boolean;
    scores: RegularSeasonPlayerScoreDetailsType;
}

export interface ScoreTeamParamsType {
    teamData: CalculationTeamType;
    nominal: CalculationTeamReturnType;
    spartacusSlots: CalculationSlotType[];
    slots: CalculationSlotType[];
    opponentSlots: CalculationSlotType[];
    opponentSpartacusSlots: CalculationSlotType[];
    opponentTeamData: CalculationTeamType;
    roundNumber: number;
    includeCompetitiveAwards: boolean;
}

export interface SelectReserveLineupParamsType {
    teamData: CalculationTeamType;
    nominal: CalculationTeamReturnType;
    slots: CalculationSlotType[];
    roundNumber: number;
    opponentSpartacusSlots: CalculationSlotType[];
}

export interface GetEffectivePlayersParamsType {
    teamData: CalculationTeamType;
    slots: CalculationSlotType[];
}

export interface ReplacementPlayerParamsType {
    teamData: CalculationTeamType;
    playerId: string;
}

export interface GenerateStartingLineupMatrixParamsType {
    teamData: CalculationTeamType;
    nominal: CalculationTeamReturnType;
}

export interface CalculateRemisParamsType
    extends SetPlayCalculationParamsType<SetPlayEnumType.Remis> {
    isMatchDraw?: boolean;
}

export interface GetSpartacusAverageParamsType {
    teamData: CalculationTeamType;
    nominalPlayerId: string;
    average: number;
}

export interface CalculateMuchomorParamsType {
    players: CalculationPlayerType[];
}

export interface CalculatePauloSousaParamsType {
    players: CalculationPlayerType[];
    opponentPlayers: CalculationPlayerType[];
}

export interface CalculatePijanyCieslakParamsType {
    trainerScore: number;
    opponentTrainerScore: number;
}

export interface CalculateBrudnaPalaParamsType {
    setPlay: Extract<SetPlaysDataSelectionReturnType, { type: SetPlayEnumType.BrudnaPala }>;
}

export interface CalculateKoloFortunyNorbiegoParamsType {
    setPlay: Extract<SetPlaysDataSelectionReturnType, { type: SetPlayEnumType.KoloFortunyNorbiego }>;
    scoreDifference: number;
}

export interface GetWinningStartCountParamsType {
    players: CalculationPlayerType[];
}

export interface GetTrainerHeatTotalParamsType {
    trainer: CalculationTeamReturnType['trainer'];
}
