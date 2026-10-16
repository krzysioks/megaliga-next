import mongoose from 'mongoose';
import { z } from 'zod';

import { heatScoresSchema, playerSchema } from '@/db/models/schema.types';

export type ConnectType = Promise<void | typeof mongoose>;

export type MatchPairType = [userOneId: string, userTwoId: string];

export type PlayerScoreDetailsType = Omit<
    z.infer<typeof playerSchema>,
    'playerId' | 'comment' | 'setPlay'
>;

export type PlayerScoreDetailsInputType = z.input<typeof heatScoresSchema>;

export const DEFAULT_PLAYER_SCORE_DETAILS: PlayerScoreDetailsType =
    heatScoresSchema.parse({});
