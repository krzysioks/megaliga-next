# Megaliga set-play database model: implementation plan

Status: approved for implementation; the model-level testing seam is confirmed. The user requested implementation without committing changes. Publication to an issue tracker is excluded because the user chose to work without tracker setup.

## Problem Statement

Users currently describe their set plays in a free-text starting-lineup field. Administrators must interpret that text before calculating the effect of each play. This representation cannot reliably distinguish the 17 available options, validate their different inputs, or associate additional admin results with a particular purchased play.

The immediate task is to prepare a structured database model for the Megaliga regular-season stage. User and admin designs have been inspected, and the required fields and purchasing rules have been collected. UI implementation, scoring calculations, and integration with existing consumers are later steps.

## Solution

Store each lineup's selected set plays in a dedicated collection. Each play has a stable identity, a type-specific user payload, and, where required, a separate type-specific admin result payload.

A user can submit only complete selections. The database module validates the complete round purchase and the selected players. Administrators can subsequently enter results for an individual play without changing the user's selections. Missing heat values become zero when heat results are submitted.

The recommended storage unit is one document per starting lineup with an array of at most six plays. This refines the earlier one-document-per-play proposal: the bounded array keeps the complete round purchase within one document, while keeping this feature separate from existing lineup and scoring consumers.

## User Stories

1. As a user, I want to select set plays for my regular-season lineup, so that my chosen tactics are recorded accurately for that round.
2. As a user, I want to select at most six plays per round, so that my selection respects the limit shared by all three-point plays.
3. As a user, I want to use a non-reserve play type up to twice per round, so that repeated purchases follow the league rules regardless of the selected player.
4. As a user, I want to select at most one Rezerwa and at most one Rezerwa giełda per round, so that neither reserve type can be purchased twice, even when the other is absent.
5. As a user, I want each round to allow up to six plays independently, so that unused selections do not carry into later rounds or the return leg.
6. As a user, I want incomplete forms rejected before saving, so that the administrator receives all required selection information.
7. As a user, I want Gwarancja startów to identify a player from my starting lineup, so that the intended player receives the play's effect.
8. As a user, I want to select Remis without additional inputs, so that I can purchase it without supplying information reserved for the administrator.
9. As a user, I want Rezerwa to identify a player from my squad, so that my chosen substitute is recorded.
10. As a user, I want Rezerwa giełda to identify an undrafted player from my applicable draft pool, so that my market substitute is eligible.
11. As a user, I want to select Mortal Kombat Combo without additional inputs, so that this selection is recorded as a distinct play type.
12. As a user, I want to select Muchomor without additional inputs, so that this selection is recorded as a distinct play type.
13. As a user, I want to select NCD, so that the ordinary variant is distinguished from NCD6.
14. As a user, I want to select NCD6, so that the second variant retains its own identity despite sharing an admin input shape with NCD.
15. As a user, I want Spartacus to identify one player from my squad and one from my opponent's squad, so that both sides of the comparison are recorded.
16. As a user, I want Spartacus to become available in round two, so that a round-one purchase is rejected.
17. As a user, I want to select Pijany Cieślak without additional inputs, so that this selection is recorded as a distinct play type.
18. As a user, I want Brudna pała to identify four active league players as leaders, so that their individual results can be evaluated later.
19. As a user, I want to select Paulo Sousa without additional inputs, so that this selection is recorded as a distinct play type.
20. As a user, I want Ryszard Kowalski to identify a player from my starting lineup, so that the intended player is unambiguous.
21. As a user, I want Typer to select a player from either starting lineup and record two independent attempts across heats one through four, so that all eight predictions retain their attempt and heat associations.
22. As a user, I want to select Taktyczna without additional inputs, so that this selection is recorded as a distinct play type.
23. As a user, I want Awatar to identify a player outside my opponent's squad, so that an ineligible opponent player cannot be selected.
24. As a user, I want Koło Fortuny Norbiego to record minimum and maximum prediction bounds, so that the selected interval is unambiguous.
25. As an administrator, I want to retrieve a lineup's plays with their selection identities and user inputs, so that I can enter results for the correct purchases.
26. As an administrator, I want Remis to record which starting-lineup players participated in drawn Extraliga matches, so that only the marked players are included in its evaluation.
27. As an administrator, I want to record seven heat scores for a Rezerwa substitute, so that its later score calculation has structured inputs.
28. As an administrator, I want to record seven heat scores for a Rezerwa giełda substitute, so that its later score calculation has structured inputs.
29. As an administrator, I want NCD and NCD6 to record four qualifying players, so that their shared result inputs can be used with the correct selected variant.
30. As an administrator, I want Spartacus to record both selected players' average points per heat, so that the later comparison has the required numeric inputs.
31. As an administrator, I want Brudna pała to record one true/false result for each of the four selected leaders, so that every checkbox maps to the correct player.
32. As an administrator, I want to record seven heat scores for the selected Awatar player, so that its later score calculation has structured inputs.
33. As an administrator, I want omitted heat values filled with zero when submitting results, so that the saved seven-heat payload is complete.
34. As an administrator, I want two purchases of the same type to remain distinguishable, so that updating one purchase does not overwrite the other's results.
35. As a user, I want unchanged plays to retain their identities and recorded admin results when I edit my selection, so that unrelated data is preserved.
36. As an administrator, I want results tied to superseded player selections cleared when those selections change, so that stale results are not reused.
37. As a developer, I want this model delivered independently of the existing consumers, so that database behavior can be verified before UI and scoring integration.
38. As a user, I want to edit an individual saved play through a dedicated model operation, so that I can change my selection without resubmitting unrelated plays.
39. As a user, I want to remove an individual saved play through a dedicated model operation, so that I can withdraw that selection while preserving the rest of my round's plays.

## Implementation Decisions

### Scope and existing conventions

- Implement a standalone regular-season set-play database module using the repository's Mongoose, Zod, and inferred TypeScript type conventions.
- Preserve the existing free-text lineup field and its consumers during this step. The new structured collection is the future replacement; dual-writing, migration, and consumer changes are excluded.
- Resolve the owning user and round from the referenced starting lineup. Resolve an opponent, when needed, from the regular-season schedule rather than from client-supplied opponent information.
- Reuse the player model's existing Dolce/Gabbana assignment concepts to determine squad membership and the applicable undrafted-player pool. Playoff assignments are outside this step.
- Required references must actually be required in the new input schemas. The existing shared ObjectId validator is optional and must not accidentally make these fields optional.

### Collection and document structure

- Create one dedicated collection with one document per regular-season starting lineup. Enforce this relationship with a unique index on the lineup reference.
- Each document contains the lineup reference and an ordered array of zero to six selected plays.
- Keep Mongoose's default automatic document versioning. Phase 1 adds no custom revision handling, optimistic-concurrency configuration, or stale-save conflict handling, and callers do not need to submit a revision.
- Every embedded play has its own server-generated ObjectId, a stable type identifier, its user payload, and its optional admin payload.
- Use Mongoose embedded discriminators for persistence and a Zod discriminated union for input validation. Every type has a concrete schema; unrelated fields and unsupported types are rejected. Mongoose supports different subdocument schemas within one array through [embedded discriminators](https://mongoosejs.com/docs/8.x/docs/discriminators.html).
- Keep type identifiers and Polish display names in a typed application registry. Per-type cost fields are unnecessary because every play costs the same. A separate collection of play definitions or one collection per type is unnecessary.
- Give NCD and NCD6 separate type identifiers while reusing their result schema.
- Player selections and admin results use references to existing player records, not free-text names. Names can be populated when reading.
- Keep a selected play's type immutable. Changing to another type replaces the selection with a new identity and fresh payload.

### Type-specific inputs

“None” below means the type has no additional payload for that actor, not that the play itself is absent.

| Set play | Required user data and eligibility | Additional admin data |
| --- | --- | --- |
| Gwarancja startów | One player from the user's starting lineup | None |
| Remis | None | IDs of the user's starting-lineup players whose Extraliga match was a draw; an empty list is valid |
| Rezerwa | One player from the user's squad | Seven heat scores for that selected player |
| Rezerwa giełda | One undrafted player from the user's applicable pool | Seven heat scores for that selected player |
| Mortal Kombat Combo | None | None |
| Muchomor | None | None |
| NCD | None | Four distinct qualifying player IDs |
| NCD6 | None | Four distinct qualifying player IDs |
| Spartacus | One own-squad player and one opponent-squad player; round two onward | Average points per heat for each selected player; no checkboxes |
| Pijany Cieślak | None | None |
| Brudna pała | Four distinct leader IDs from active current-season player records | Four player/result pairs, each containing one selected leader ID and an explicit boolean |
| Paulo Sousa | None | None |
| Ryszard Kowalski | One player from the user's starting lineup | None |
| Typer | One player from either starting lineup, plus two independent attempts with four heat predictions each | None |
| Taktyczna | None | None |
| Awatar | One player from the player collection, excluding the opponent's squad | Seven heat scores for that selected player |
| Koło Fortuny Norbiego | Minimum and maximum prediction bounds | None |

- Typer's attempts are independent predictions, not lower/upper bounds. Preserve the two-attempt grouping shown in the design.
- Retain the existing seven named heat fields and existing heat-score range. Apply zero defaults within the new set-play payload only; leave ordinary-score defaults unchanged.
- Require finite, non-negative values for predictions, interval bounds, and average points per heat. Averages support fractional values. Do not invent additional integer constraints or prediction ceilings that were not specified.
- Minimum prediction bounds must not exceed maximum bounds.
- Remis player IDs must be unique and belong to the referenced starting lineup.
- NCD result references must exist. Brudna pała results must cover exactly the selected four leaders, once each; missing, duplicate, and foreign leader entries are rejected. False is a valid explicit result.
- Brudna pała's real-world leader and away-match conditions are selection criteria from the requirements. The current player records do not contain enough club/fixture data to verify these conditions automatically; enforce active-player eligibility and record the chosen IDs.

### Round purchase rules

- Validate the selected-play array length directly: it must contain at most six entries. All plays cost three points, so no cost calculation or budget accounting is needed.
- Each non-reserve type may appear at most twice in the round's complete selection, regardless of the selected player. NCD and NCD6 are counted separately.
- Rezerwa may appear at most once per round, and Rezerwa giełda may appear at most once per round. These limits apply independently: either can be selected alone, or one of each can be selected together. Other types can coexist with reserve plays.
- Zero plays is valid. The six-play limit applies independently to each round; unused selections do not increase any later round's limit, including the return leg.
- The module validates these rules against the entire proposed selection, not merely against the one play being added.
- Spartacus is rejected for round one using the referenced lineup's round, not a client-supplied round value.

### Public operations and write behavior

Expose one model-level seam through five typed public Mongoose static methods:

1. `getSetPlays`: read the selected plays for a starting lineup, including stable play IDs, user payloads, and available admin payloads.
2. `saveSetPlays`: save the complete user selection for that lineup, including new selections. Accept only selection identities, type identifiers, and user inputs. Validate all entries, references, eligibility, and round rules before committing any change.
3. `updateSetPlay`: edit one saved play by lineup reference and play ID, accepting its type and complete user payload. Validate the resulting selection against the same input, eligibility, and round rules as a full save. Preserve the order and all unrelated plays. For an unchanged type, retain the play ID and clear its admin results only when user inputs change. Selecting a different type replaces that entry with a new ID and no admin results.
4. `removeSetPlay`: remove one saved play by lineup reference and play ID, including its admin payload. Preserve the relative order, identities, inputs, and results of all remaining plays. Removing the last play leaves a valid empty selection for that lineup.
5. `saveSetPlayResults`: save a complete admin result payload for a particular play ID within that lineup. Select the result schema from the persisted play type, and preserve all user data and unrelated play results.

- A lineup must exist before its set plays can be saved. Opponent-dependent choices also require the scheduled opponent and any starting lineup needed to validate that choice.
- Individual edit, removal, and result operations must target an existing play within the referenced lineup. Reject malformed, unknown, removed, or foreign-lineup play IDs without changing persisted data. User edit and removal operations return the updated lineup selection, including any replacement play ID.
- Share selection validation and preservation rules between full saves and individual edits; avoid separate implementations of the same purchase rules.
- Reject client-supplied admin results through the user operation and client-supplied selection changes through the admin operation.
- Assign new identities to new plays. Existing identities must belong to the same lineup and appear at most once in the submitted selection.
- Preserve identities and admin results for unchanged plays, including when their order changes. Remove omitted plays. Clear a play's admin results if its user inputs change, so that old results cannot be associated with a new selection.
- All required user inputs must be present before the user selection is saved. This does not require admin results to exist at selection time: the two actors act at different stages.
- Admin data remains absent until submitted. When a heat-result payload is submitted, every omitted heat becomes zero, including a payload with no entered heat values. Missing non-heat admin inputs are rejected.
- A submitted empty Remis list records that none of the lineup players qualified; it is distinguishable from absent admin data.
- Validate the resulting document before saving. MongoDB guarantees atomic writes within a [single document](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/).
- Ensure simultaneous initial saves cannot create two documents for the same lineup. The unique index is the persistence constraint; an in-memory existence check alone is insufficient.
- Authentication and HTTP authorization are implemented during later API integration. The current operations separate actor payloads and validate relationships without adding an authentication subsystem.

### Implementation sequence

1. Define the 17-type registry, shared payloads, and Zod contracts. Cover complete user input, allowed admin payloads, heat defaults, and the complete round purchase rules.
2. Define the aggregate Mongoose model, embedded discriminator schemas, player/lineup references, stable play identities, and unique lineup index.
3. Implement the public read, full user-save, individual edit, and individual removal static methods, including lineup/schedule lookups, applicable player assignments, shared complete-purchase validation, and preservation or invalidation of existing results.
4. Implement the admin-result operation, including type-specific validation and targeting by play identity.
5. Verify the behavior through the agreed public seam using real MongoDB persistence. Add focused input-contract tests only where they make failures clearer without duplicating the public-operation tests.
6. Run the focused model tests, type checking, and linting of the changed modules. Confirm that this change has not altered existing lineup, scoring, history, or playoff behavior.

## Testing Decisions

### Confirmed testing seam

Test the five public set-play static methods as the primary seam, including individual edits and removals. This is the highest available seam for the database-only scope and follows the repository's existing model-method testing pattern. Use the real starting-lineup, player, schedule, and set-play models with isolated test fixtures; avoid mocking MongoDB queries or asserting discriminator registration internals.

The user confirmed testing the model's public save/read/result operations against MongoDB. HTTP integration testing would broaden the current scope because no new API is being delivered in this step.

### Observable behavior to cover

- Each of the 17 types can be saved and read back with its complete, correct user payload. Unsupported types, unknown fields, missing required inputs, and malformed references are rejected without partial persistence.
- No-admin-input plays do not accept an unrelated admin payload.
- Six plays are accepted when all per-type rules hold; a seventh is rejected. A non-reserve type may appear twice, including on the same player, but a third occurrence is rejected even when players differ.
- NCD and NCD6 remain distinguishable and have independent occurrence counts.
- Zero reserves, either reserve type once alone, and one of each are accepted, including alongside other types within the six-play limit. Two Rezerwa entries or two Rezerwa giełda entries are rejected, whether or not the other reserve type is present and regardless of the selected players.
- Each round independently accepts at most six plays, even if the previous round used fewer; unused selections cannot raise a later round's limit.
- Spartacus is rejected in round one and accepted from round two when its player relationships are valid.
- Required references point to existing records. Own-lineup, own-squad, opponent-squad, combined-lineup, undrafted-pool, active-player, and opponent-exclusion rules are exercised through the public user-save operation.
- Undrafted-player eligibility is checked in the correct Dolce/Gabbana pool. Include both missing and null assignment values when evaluating the applicable pool, since the existing model's available-player query currently checks explicit null values only.
- Typer rejects a missing attempt, missing heat, or missing prediction; all eight independent values survive a round trip without imposing ordering between the two attempts.
- Koło Fortuny rejects reversed bounds. Numeric payloads reject non-finite and negative values; fractional averages remain valid.
- Saving heat results for either reserve type or Awatar stores all seven values, filling omitted heats with zero. Explicit zeros survive a round trip.
- Remis accepts an empty evaluated list, rejects duplicate or non-lineup player IDs, and distinguishes absent results from an evaluated empty list.
- NCD and NCD6 require four distinct existing player IDs when admin results are submitted.
- Brudna pała requires exactly one explicit result for each selected leader. False remains false; missing, duplicate, and unrelated leaders are rejected.
- Spartacus stores exactly the two averages and rejects checkbox fields.
- Two identical-type purchases have different identities. An admin update affects only the addressed instance and leaves the other instance unchanged.
- Reordering or resubmitting unchanged selections preserves their identities and results. Changing a play's user input clears only that play's results. Removing a play makes its former ID unavailable to the admin-result operation.
- Individual edits persist valid changed inputs, retain the ID for the same type, and clear only the edited play's admin results. An unchanged edit preserves its results. A type change replaces the entry at the same position with a new ID and no results; the former ID becomes unavailable. Invalid edits, including duplicate reserve types or a third occurrence of another type, leave the entire saved selection intact.
- Individual removal deletes only the addressed play and its results, preserves all other entries and their relative order, and allows another play to be added within the occurrence and six-play limits. Removing the last play persists an empty selection that can be read back.
- Edit and removal operations reject malformed, unknown, removed, and foreign-lineup play IDs without modifying either lineup. Verify the individual static methods through real MongoDB save/read behavior, rather than relying only on full-batch replacement tests.
- Invalid batch saves leave the previously saved selection intact. Invalid admin submissions preserve the previous valid result payload.
- The unique lineup index rejects duplicate document creation, including simultaneous initial saves. Persisted selections satisfy the complete purchase rules.
- Existing lineup and scoring test behavior remains unchanged. The legacy free-text field continues to work until the separate integration step.

### Prior art and test quality

Existing starting-lineup and player tests exercise public model methods, seed related records, assert persisted/read-back behavior, and clean up their test fixtures. Follow that approach for this feature. Use a dedicated test database and limit cleanup to test fixtures or collections that belong to the test suite.

A good test demonstrates a league rule, a meaningful payload difference, or an observable persistence guarantee. Avoid tests that merely count schema registrations, inspect private helper calls, or duplicate the implementation's structure. Index tests require real persistence; constructing a Mongoose document and validating it without saving is not sufficient evidence for those guarantees.

## Out of Scope

- Playoff and play-in models, references, purchasing differences, and UI flows.
- User dropdowns, forms, availability displays, and admin form implementation.
- Scoring formulas, calculated points, score adjustments, and changes to ordinary player-score entry.
- HTTP routes, authentication changes, and API integration tests for routes not delivered here.
- Replacing or migrating the legacy free-text field, dual-writing, and updating existing score-detail DTOs, history exports, or other consumers.
- Season-reset integration, archive snapshots, lineup-deletion cleanup, and migration of old free-text selections.
- Automatic real-world Extraliga leader/away-fixture verification without the required source data.
- A database-backed play catalogue, separate collections per type, or speculative playoff abstractions.
- Issue tracker setup, publication, and triage label creation.

## Further Notes

- The user clarified the reserve rule: each reserve type is limited to one selection per round, independently of the other. Other play types may be selected alongside them.
- User designs confirmed Typer's two named attempts, Brudna pała's four dropdowns, Spartacus's two player selections, and Koło Fortuny's Min/Max inputs.
- Admin designs confirmed Remis checkboxes, separate seven-heat payloads for the two reserve variants and Awatar, and four NCD/NCD6 dropdowns. The designer removed the accidental Spartacus checkboxes and added the missing Brudna pała result checkboxes; both updates were verified.
- Paulo Sousa and Taktyczna were not located by name on the inspected user-design page. Their written requirements remain authoritative: both require no additional user or admin inputs.
- The existing starting-lineup reference supplies current-season ownership and round context. This spec adds no season history storage; the later integration step must define archive and cleanup behavior before using the new collection in season rollover.
- The model-level testing seam and storage recommendation are approved. Implementation follows the existing model conventions, with public static operations verified against MongoDB.
