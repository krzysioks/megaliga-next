import { z } from 'zod';

// Shared Zod schemas for reusable types across models
const heatSchema = z.number().min(0).max(100).optional();
export const standardStringSchema = z.string().max(255);
export const draftNumberSchema = z.number().max(20).optional();
export const objectIdSchema = z
    .string()
    .regex(/^[0-9a-f]{24}$/i, 'Invalid ObjectId format')
    .optional();

// Player schema for individual player stats in a game
export const playerSchema = z.object({
    playerId: objectIdSchema, // Reference to player's document in Players collection
    // TODOKP Idea is to keep players in Players collection even if they are no more active in megaliga. We will add new field status to indicate if should be shown in draft for current season or not. Keeping players in Players collection will help to collect and keep statistics
    heatOne: heatSchema,
    heatTwo: heatSchema,
    heatThree: heatSchema,
    heatFour: heatSchema,
    heatFive: heatSchema,
    heatSix: heatSchema,
    heatSeven: heatSchema,
    setPlay: heatSchema,
    comment: standardStringSchema.optional()
});

// Trainer schema for trainer stats in a game
export const trainerSchema = playerSchema.pick({
    heatOne: true,
    heatTwo: true,
    heatThree: true,
    heatFour: true,
    heatFive: true,
    heatSix: true,
    heatSeven: true,
    setPlay: true,
    comment: true
});

// Team schema for team details in a game (used for both teamOne and teamTwo)
export const historyTeamSchema = z.object({
    teamId: objectIdSchema, // Reference to team in History.teams
    score: z.number(),
    setPlays: z.array(standardStringSchema).optional(),
    players: z.array(playerSchema).optional(),
    trainer: trainerSchema.optional()
});

export const teamSchema = z.object({
    userId: objectIdSchema, // Reference to  User model, from where we will populate team name
    score: z.number(),
    players: z.array(playerSchema).optional(),
    trainer: trainerSchema.optional(),
    startingLineupId: objectIdSchema.optional() // Reference to StartingLineup model, from which we will populate setplays
});

// Shared schemas for common patterns
export const nameSchema = z.string().min(2).max(60);
export const teamNameSchema = z.string().min(2).max(50);
export const logoUrlSchema = z.string().url().min(2).max(2048);
export const teamReferenceSchema = z.object({
    name: teamNameSchema,
    coachName: nameSchema,
    logoUrl: logoUrlSchema
});

export const placeSchema = z.number().min(1).max(20);

export const standingSchema = z.object({
    place: placeSchema,
    userId: objectIdSchema, // Reference to  User model, from where we will populate team name
    played: z.number().min(1).max(20),
    wins: z.number().min(0).max(20),
    draw: z.number().min(0).max(20),
    defeat: z.number().min(0).max(20),
    balance: z.number(),
    points: z.number().min(0).max(70),
    ligueGroup: z.string()
});

export const historyStandingSchema = z.object({
    place: placeSchema,
    teamId: objectIdSchema,
    played: z.number().min(1).max(20),
    wins: z.number().min(0).max(20),
    draw: z.number().min(0).max(20),
    defeat: z.number().min(0).max(20),
    balance: z.number(),
    points: z.number().min(0).max(70),
    ligueGroup: z.string()
});

export const standingPlayinSchema = historyStandingSchema.omit({
    ligueGroup: true
});

export const standingPlayoffSchema = z.object({
    place: placeSchema,
    teamId: objectIdSchema
});

export const standingsGrandPrixSchema = z.object({
    place: placeSchema,
    teamId: objectIdSchema,
    played: z.number().min(1).max(20),
    points: z.number().min(0).max(200)
});

export const booleanDefaultFalseSchema = z.boolean().default(false);
export const numberDefaultZeroSchema = z.number().min(0).default(0);
export const optionalStringSchema = z.string().optional();
export const stageEnumSchema = z.enum(['regularSeason', 'playoff', 'playIn']);
export const roundNumberSchema = z.number().min(1).max(20);
