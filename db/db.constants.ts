import { playerScoresZodSchema } from '@/db/models/schema.types';

export const MIN_REGULAR_SEASON_ROUND = 1;
export const MAX_REGULAR_SEASON_ROUND = 14;

export const MAX_SET_PLAYS_PER_ROUND = 6;
export const MAX_SELECTIONS_PER_SET_PLAY = 2;
export const MAX_SELECTIONS_PER_RESERVE_SET_PLAY = 1;

export const STARTING_LINEUP_PLAYER_COUNT = 5;
export const BRUDNA_PALA_LEADER_COUNT = 4;

export const CALCULATION_HEAT_KEYS = playerScoresZodSchema.keyof().options;

export const STARTING_LINEUP_POSITION_KEYS = [
    'playerOne',
    'playerTwo',
    'playerThree',
    'playerFour',
    'playerFive'
] as const;

export const LIDER_FIRST_POINT_TOTAL = 11;
export const MAX_LIDER_POINTS = 5;
export const KAPITAN_POINTS = 4;
export const ORDINARY_RACE_BONUS = 1;
