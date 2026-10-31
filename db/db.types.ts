import type {
    SetPlaysDataForUserReturnType,
    SetPlaysDataListByStartingLineupIdReturnType
} from '@/db/models/games/set-plays-data';
import type { StartingLineupType } from '@/db/models/games/starting-lineup';
import type { PlayersReturnType } from '@/db/models/players';

import mongoose from 'mongoose';
import { z } from 'zod';

import { heatScoresSchema, playerSchema } from '@/db/models/schema.types';

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
    setPlayPlayers: Pick<PlayersReturnType, 'playerId' | 'extraligaPlayerName'>[];
    setPlayDescriptions: string;
};

export type PlayerScoreDetailsType = Omit<
    z.infer<typeof playerSchema>,
    'playerId' | 'comment' | 'setPlay'
>;

export type PlayerScoreDetailsInputType = z.input<typeof heatScoresSchema>;

export const DEFAULT_PLAYER_SCORE_DETAILS: PlayerScoreDetailsType =
    heatScoresSchema.parse({});
