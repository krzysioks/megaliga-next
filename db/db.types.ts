import mongoose from 'mongoose';
import { z } from 'zod';

import { playerSchema } from '@/db/models/schema.types';

export type ConnectType = Promise<void | typeof mongoose>;

export type PlayerScoreDetailsType = Omit<
    z.infer<typeof playerSchema>,
    'playerId' | 'comment' | 'setPlay'
>;

export const DEFAULT_PLAYER_SCORE_DETAILS: PlayerScoreDetailsType = {
    heatOne: undefined,
    heatTwo: undefined,
    heatThree: undefined,
    heatFour: undefined,
    heatFive: undefined,
    heatSix: undefined,
    heatSeven: undefined
};
