import type { SetPlayEnumType } from '@/db/models/schema.types';

export const PLAYER_ROLE_LABELS = [
    ['pn', 'PN'],
    ['kb', 'KB'],
    ['p', 'P']
] as const;

export const SET_PLAY_SHORT_LABELS: Partial<Record<SetPlayEnumType, string>> = {
    gwarancjaStartow: 'GS',
    koloFortunyNorbiego: 'KFN'
};
