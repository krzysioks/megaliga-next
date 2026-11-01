import { z } from 'zod';

export enum ScheduleStatus {
    Generated = 'schedule generated',
    ReadyForGeneration = 'schedule ready for generation',
    NotReadyForGeneration = 'schedule not ready for generation'
}

export enum SetPlayEnumType {
    GwarancjaStartow = 'gwarancjaStartow',
    Remis = 'remis',
    Rezerwa = 'rezerwa',
    RezerwaGielda = 'rezerwaGielda',
    MortalKombatCombo = 'mortalKombatCombo',
    Muchomor = 'muchomor',
    Ncd = 'ncd',
    Ncd6 = 'ncd6',
    Spartacus = 'spartacus',
    PijanyCieslak = 'pijanyCieslak',
    BrudnaPala = 'brudnaPala',
    PauloSousa = 'pauloSousa',
    RyszardKowalski = 'ryszardKowalski',
    Typer = 'typer',
    Taktyczna = 'taktyczna',
    Awatar = 'awatar',
    KoloFortunyNorbiego = 'koloFortunyNorbiego'
}

// Shared Zod schemas for reusable types across models
export const heatSchema = z.number().min(0).max(100).default(0);
export const standardStringSchema = z.string().max(255);
export const draftNumberSchema = z.number().max(20).optional();
export const objectIdSchema = z
    .string()
    .regex(/^[0-9a-f]{24}$/i, 'Invalid ObjectId format')
    .optional();

export const uniquePlayerIdList = z
    .array(objectIdSchema)
    .refine((ids): ids is string[] => {
        return (
            ids.every(id => id !== undefined) &&
            new Set(ids.map(id => id?.toLowerCase())).size === ids.length
        );
    }, 'Player IDs must be present and distinct');

export const booleanDefaultFalseSchema = z.boolean().default(false);

export const playerHeatZodSchema = z
    .object({
        value: heatSchema.nullable().default(null),
        bonus: booleanDefaultFalseSchema,
        isNominated: booleanDefaultFalseSchema
    })
    .default({});

export const playerScoresZodSchema = z.object({
    heatOne: playerHeatZodSchema,
    heatTwo: playerHeatZodSchema,
    heatThree: playerHeatZodSchema,
    heatFour: playerHeatZodSchema,
    heatFive: playerHeatZodSchema,
    heatSix: playerHeatZodSchema,
    heatSeven: playerHeatZodSchema
});

// Numeric heat scores are used by trainers, Typer, history, and playoff views.
export const heatScoresSchema = z.object({
    heatOne: heatSchema,
    heatTwo: heatSchema,
    heatThree: heatSchema,
    heatFour: heatSchema,
    heatFive: heatSchema,
    heatSix: heatSchema,
    heatSeven: heatSchema
});

export const attemptZodSchema = heatScoresSchema.pick({
    heatOne: true,
    heatTwo: true,
    heatThree: true,
    heatFour: true
});

// Player schema for individual player stats in a game.
export const playerSchema = heatScoresSchema.extend({
    playerId: objectIdSchema, // Reference to player's document in Players collection
    // TODOKP Idea is to keep players in Players collection even if they are no more active in megaliga. We will add new field status to indicate if should be shown in draft for current season or not. Keeping players in Players collection will help to collect and keep statistics
    setPlay: heatSchema,
    comment: standardStringSchema.optional()
});

export const regularSeasonPlayerSchema = playerScoresZodSchema.extend({
    playerId: objectIdSchema,
    setPlay: z.number().max(100).default(0),
    comment: standardStringSchema.optional()
});

// Trainer schema for trainer stats in a game
export const trainerSchema = playerSchema.omit({ playerId: true });

const historyHeatScoresSchema = z.object({
    heatOne: heatSchema.nullable().default(null),
    heatTwo: heatSchema.nullable().default(null),
    heatThree: heatSchema.nullable().default(null),
    heatFour: heatSchema.nullable().default(null),
    heatFive: heatSchema.nullable().default(null),
    heatSix: heatSchema.nullable().default(null),
    heatSeven: heatSchema.nullable().default(null)
});

export const historyPlayerSchema = historyHeatScoresSchema.extend({
    playerId: objectIdSchema,
    setPlay: z.number().max(100).default(0),
    comment: standardStringSchema.optional()
});

export type HistoryPlayerType = z.infer<typeof historyPlayerSchema>;

// Team schema for team details in a game (used for both teamOne and teamTwo)
export const historyTeamSchema = z.object({
    teamId: objectIdSchema, // Reference to team in HistoryTeam collection
    score: z.number(),
    setPlays: z.string().default(''),
    players: z.array(historyPlayerSchema).optional(),
    trainer: trainerSchema.optional()
});

export const teamSchema = z.object({
    userId: objectIdSchema, // Reference to  User model, from where we will populate team name
    players: z.array(playerSchema).optional(),
    trainer: trainerSchema.optional(),
    startingLineupId: objectIdSchema.optional() // Reference to StartingLineup model, from which we will populate setplays
});

export const regularSeasonTeamSchema = teamSchema.extend({
    players: z.array(regularSeasonPlayerSchema).optional()
});

// Shared schemas for common patterns
export const nameSchema = z.string().min(2).max(60);
export const teamNameSchema = z.string().min(2).max(50);
export const logoUrlSchema = z.string().url().min(2).max(2048);
export const teamReferenceSchema = z.object({
    name: teamNameSchema,
    coachName: nameSchema.optional(),
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
    ligueGroupsId: objectIdSchema
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

export const numberDefaultZeroSchema = z.number().min(0).default(0);
export const numberSchema = z.number().min(0);
export const optionalStringSchema = z.string().optional();
export const stageEnumSchema = z.enum(['regularSeason', 'playoff', 'playIn']);
export const statusEnumSchema = z.enum(['active', 'inactive']);
export const actionCentreNotificationTypeSchema = z.enum([
    'ligueGroupLottery',
    'draftOrderLottery',
    'startingLineupSelection',
    'startingLineupSelectionPlayoff',
    'draftPick',
    'draftPickPlayoff'
]);
export const actionCentreNotificationStatusSchema = z.enum([
    'new',
    'completed'
]);
export const roundNumberSchema = z.number().min(1).max(20);
export const thropyTypeSchema = z.enum(['megaliga', 'grandprix']);
const editorJsBlockSchema = z.object({
    id: z.string().optional(),
    type: z.string().min(1),
    data: z.record(z.string(), z.unknown())
});

export const editorJsContentSchema = z.object({
    time: z.number().optional(),
    version: z.string().optional(),
    blocks: z.array(editorJsBlockSchema).min(1)
});
