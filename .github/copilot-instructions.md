# Megaliga Next - AI Coding Assistant Instructions

## Project Overview

Megaliga Next is a Next.js application for managing a fantasy speedway league. It handles player drafts, game scheduling, scoring, standings, and historical data using MongoDB with Mongoose ODM.

## Architecture

- **Framework**: Next.js 16 with App Router, React 19, TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Zod schemas for runtime validation
- **UI**: Radix UI components with Tailwind CSS, class-variance-authority for variants
- **Forms**: React Hook Form with @hookform/resolvers
- **Authentication**: JSON Web Tokens with bcrypt-ts
- **Testing**: Jest with ts-jest, setup in `setupTestFramework.js`

## Key Directories

- `app/`: Next.js app router pages and layouts
- `db/models/`: Mongoose models with Zod validation schemas
- `server/actions/`: Server actions for data mutations
- `components/ui/`: Reusable UI components (Radix-based)
- `utils/`: Utility functions

## Data Model Patterns

Models combine Mongoose schemas with Zod validation:

```typescript
// Example from db/models/players.ts
export const playersZodSchema = z.object({
  extraligaPlayerName: standardStringSchema
  // ... fields
});
const playersSchema = new Schema<PlayersType>({
  /* Mongoose schema */
});
```

Shared schemas in `db/models/schema.types.ts` for common types like `objectIdSchema`, `standardStringSchema`.

## Validation Conventions

- Use Zod for input validation in server actions
- Custom validators in `db/models/validation.utils.ts` (e.g., `validateDate` for DD-MM-YYYY format)
- ObjectIds: `z.string().regex(/^[0-9a-f]{24}$/i)` in Zod, `Types.ObjectId` in Mongoose

## Server Actions

- Located in `server/actions/`
- Use `'use server'` directive
- Connect to DB via `new DBClient().connect()`
- Handle form submissions and data mutations

## UI Components

- Built with Radix UI primitives
- Variants managed with `class-variance-authority`
- Styling with Tailwind CSS v4
- Utility function `cn` from `utils/utils.ts` for class merging

## Development Workflow

- `npm run dev`: Development server with Turbopack
- `npm run lint:fix`: Auto-fix ESLint issues
- `npm run ts:check`: TypeScript type checking
- `npm test`: Run Jest tests

## Database Connection

- Uses MongoDB Atlas cluster
- Environment variables: `USER_DB`, `PASSWORD_DB`
- Connection cached in `globalThis.MONGOOSE_CLIENT`

## Specific Patterns

- Date format: DD-MM-YYYY (validated in `validation.utils.ts`)
- Player status: enum `['active', 'inactive']`
- Draft numbers: max 20
- Heat scores: 0-100
- References use ObjectId strings in Zod, populated from Mongoose refs

## Testing

- Node environment
- Setup file: `setupTestFramework.js`
- Transform TS/TSX with ts-jest

## Code Style

- ESLint with perfectionist plugin for import sorting
- TypeScript strict mode
- Server-only imports marked with `'server-only'`
