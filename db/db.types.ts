import type {
    SetPlaysDataForUserReturnType,
    SetPlaysDataSelectionReturnType,
    SetPlaysDataListByStartingLineupIdReturnType
} from '@/db/models/games/set-plays-data';
import type { StartingLineupType } from '@/db/models/games/starting-lineup';
import type { PlayersReturnType, PlayersType } from '@/db/models/players';
import type {
    PlayerScoresType,
    TeamCalculationDetailsType,
    playerPositionsZodSchema,
    playerRolesZodSchema,
    trainerSchema,
    playerSchema,
    stageEnumSchema
} from '@/db/models/schema.types';
import type { z } from 'zod';

import mongoose from 'mongoose';

import { SetPlayEnumType } from '@/db/models/schema.types';

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
    minimumMatchCount: number;
    documents: {
        teamOne: { players?: z.infer<typeof playerSchema>[] };
        teamTwo: { players?: z.infer<typeof playerSchema>[] };
    }[];
}

export type CalculationPlayerType = PlayerScoresType & {
    playerId: string;
    isJunior: PlayersType['isJunior'];
    setPlay: number;
    comment?: string;
};

export interface CalculationTeamType {
    players: CalculationPlayerType[];
    startingLineup: z.infer<typeof playerPositionsZodSchema> & {
        roles: z.infer<typeof playerRolesZodSchema>;
    };
    setPlayList: SetPlaysDataListByStartingLineupIdReturnType['setPlayList'];
    replacementPlayers?: Pick<CalculationPlayerType, 'playerId' | 'isJunior'>[];
}

export interface CalculateMatchScoresParamsType {
    seasonStage?: Extract<
        z.infer<typeof stageEnumSchema>,
        'regularSeason' | 'playoff'
    >;
    roundNumber: number;
    teamOne: CalculationTeamType;
    teamTwo: CalculationTeamType;
}

export interface CalculationTeamReturnType {
    players: CalculationPlayerType[];
    trainer: z.infer<typeof trainerSchema>;
    calculationDetails: TeamCalculationDetailsType;
}

export interface GetSetPlayResultParamsType {
    setPlayResults: TeamCalculationDetailsType['setPlayResults'];
    selectedSetPlayId: string;
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

export type ScoreModifierType = {
    name: string;
    points: number;
    countsTowardsLimit: boolean;
} & (
    | { kind: 'function' | 'role' | 'replacement' }
    | { kind: 'setPlay'; selectedSetPlayId: string }
);

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

export interface CalculationReplacementStepType {
    selectedSetPlayId: string;
    previousPlayerId: string;
    replacementPlayerId: string;
    basePointsDifference: number;
    trainerHeatPointsDifference: number;
}

export interface CalculationSlotType {
    player: CalculationPlayerType;
    nominalPlayerId: string;
    isReserve: boolean;
    replacementNames: string[];
    replacementSteps: CalculationReplacementStepType[];
    isMatchDraw?: boolean;
}

export interface CalculateReplacementParamsType {
    player: CalculationPlayerType;
    playerId: string;
    isJunior: boolean;
    scores: PlayerScoresType;
}

export interface ScoreTeamParamsType {
    seasonStage: NonNullable<CalculateMatchScoresParamsType['seasonStage']>;
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
    seasonStage: NonNullable<CalculateMatchScoresParamsType['seasonStage']>;
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
