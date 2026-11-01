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

export const MAX_PLAYER_MODIFIER_POINTS = 10;
export const GUARANTEED_START_COUNT = 5;
export const REMIS_POINTS = 6;
export const MAX_MORTAL_KOMBAT_COMBO_POINTS = 4;
export const NCD_POINTS = 4;
export const NCD6_CORRECT_POINTS = 6;
export const NCD6_INCORRECT_POINTS = -2;
export const SPARTACUS_POINTS = 3;
export const SPARTACUS_MIN_AVERAGE_DIFFERENCE = 0.12;
export const RYSZARD_KOWALSKI_POINTS = 2;
export const MAX_RYSZARD_KOWALSKI_POINTS = 6;
export const TACTICAL_START_INDEX = 5;

export const SPARTACUS_MIN_ROUND = 2;

export const FIFTH_PLAYER_INDEX = 4;
