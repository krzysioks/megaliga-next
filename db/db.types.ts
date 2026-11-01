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
    opponent: CalculationPlayerType;
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

export interface CalculateSpartacusParamsType extends SetPlayCalculationParamsType<SetPlayEnumType.Spartacus> {
    roundNumber: number;
    opponent: CalculationPlayerType;
}

export interface CalculateMortalKombatComboParamsType {
    liderPoints: number;
}
