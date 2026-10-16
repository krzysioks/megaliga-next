# Megaliga set-play catalog and selected-play data: first refactor

Status: implemented. The MongoDB model testing boundary was confirmed in the earlier work and is reused here. The request to implement this plan adopted the reference-driven validation approach described below.

This spec stays local under the established project workflow; issue-tracker publication and triage labels are excluded. It supersedes the original spec's embedded name/type storage and exclusion of a database-backed catalog. Other previously agreed behavior remains the baseline unless explicitly changed below.

## Problem Statement

The current model combines the definition of an available set play with a user's purchase of that play for a round. Every selection stores its own name and type, even though those values describe the available play itself. This duplicates catalog information and makes selection validation, persistence, and return types harder to maintain.

The user wants to simplify the implementation in small steps. This step separates the catalog from selected-play data and makes the catalog reference authoritative. It does not attempt to resolve unspecified missing business cases or redesign every helper at once.

## Solution

Introduce a set-play catalog containing each available play's name and enum type. Rename the existing selection model to reflect its responsibility for selected-play data. Each selected entry references a catalog document through `setPlayId` and stores the applicable user inputs and admin results.

Resolve the reference to obtain the play's name and type. The catalog supplies the displayed name and determines which existing payload and purchase rules apply.

Keep one selected-play data document per starting lineup. The lineup continues to supply the user and round; individual purchases remain entries in its `setPlayList`.

## User Stories

1. As a maintainer, I want a dedicated catalog of available set plays, so that their definitions have one authoritative source.
2. As a maintainer, I want each catalog entry to contain a name and `SetPlayEnumType` value, so that display text and behavior are represented separately.
3. As a user, I want a selected play to refer to a catalog entry, so that I select a recognized available play.
4. As a user, I want my selections associated with my starting lineup, so that they belong to the correct user and round.
5. As a user, I want the selected play's catalog type to determine its required inputs, so that incomplete or incompatible data is rejected.
6. As a user, I want malformed and nonexistent catalog references rejected, so that my saved selections remain usable.
7. As a user, I want the existing round and per-type purchase limits preserved, so that changing storage does not change the league rules.
8. As a user, I want two permitted purchases of the same catalog play to have distinct purchase identities, so that each can be edited independently.
9. As a user, I want my selected-play names read from the catalog, so that a catalog name correction appears without rewriting every selection.
10. As a user, I want my read operation to return each play's name and user inputs, so that its existing response remains easy to consume.
11. As an administrator, I want selections retrieved using a user and round, so that I can enter results for the correct lineup.
12. As an administrator, I want my read operation to return each play's catalog name and admin inputs, so that catalog normalization preserves the current response.
13. As an administrator, I want the persisted catalog reference to determine the result schema, so that submitted results cannot claim a different play type.
14. As a user, I want unchanged purchases to preserve their identities and admin results, so that resubmitting or reordering selections does not erase work.
15. As an administrator, I want results cleared when the corresponding user inputs or selected catalog play change, so that results cannot remain attached to a different selection.
16. As a user, I want removing one purchase to preserve other purchases, including another purchase of the same catalog play.
17. As a maintainer, I want stored selections to contain references rather than copied names and types, so that inconsistent duplicate metadata cannot accumulate.
18. As a maintainer, I want catalog resolution and payload validation kept straightforward, so that this refactor reduces maintenance work.
19. As a maintainer, I want the renamed model's imports and tests updated together, so that consumers use a single implementation.
20. As a maintainer, I want persistence tests to verify the public behavior, so that subsequent refactoring can change internal structure safely.

## Implementation Decisions

### Catalog and selected-play data

- Add the `set-plays` model as the catalog. Its domain fields are required `name: string` and `type: SetPlayEnumType`, alongside MongoDB's document identity. Use `standardStringSchema` and the existing enum; follow the repository's Zod, inferred-type, and Mongoose conventions.
- Rename the current `set-play` module to `set-plays-data`, updating its model/type names and affected imports consistently. Keep it responsible for selections and results.
- Retain the aggregate's required starting-lineup reference, unique lineup constraint, and bounded selection array. Do not add duplicate user or round fields or split purchases into separate documents in this step.
- Each selected entry retains its purchase `_id`, required catalog `setPlayId` reference, and applicable `userData` and `adminData`. Persist neither `name` nor `type` on that entry, including hidden discriminator copies.
- `setPlayId` identifies an available catalog play. The existing `playId` identifies one purchased instance. Multiple permitted purchases may share `setPlayId`; updates, removals, and result submissions must continue to target the purchase identity.
- Use distinct MongoDB collections for catalog definitions and selection data. Inspect the existing collection binding when renaming the model: Mongoose's default pluralization must not route the new catalog into the old selection collection. A module rename must not silently move or discard stored data.
- Do not introduce prices, active flags, ordering, versioning, catalog-management statics, or uniqueness rules for catalog names/types without an actual requirement.

### Meaning of the discriminator requirement

The user's requirement is that `setPlayId` replaces the stored `type` as the selection's discriminator. A reference and a native Mongoose discriminator key have different behavior: Mongoose selects registered schemas using discriminator values, while population resolves referenced documents. Merely changing the key to `setPlayId` does not make Mongoose consult the catalog's `type`. See the [Mongoose 8 discriminator documentation](https://mongoosejs.com/docs/8.x/docs/discriminators.html) and [population documentation](https://mongoosejs.com/docs/8.x/docs/populate.html).

**Implementation approach:** use `setPlayId` as the public and persisted selector. Resolve its catalog entry, then use the resolved enum type to validate the payload and apply the existing rules. Keep any resolved type in memory only. This preserves the requested normalized storage without registering schema variants for database-generated IDs.

- A generated ObjectId does not by itself encode a TypeScript payload variant. Do not claim compile-time narrowing from an arbitrary ID string or turn database-generated IDs into hardcoded Zod literals. Zod's discriminated unions distinguish branches using known discriminator values; see the [Zod 3 documentation](https://v3.zod.dev/?id=discriminated-unions).
- Reuse the existing per-type payload schemas and rule validation where practical. An internal resolved representation may retain enum-based narrowing while the persisted representation contains only the catalog reference and data.
- Keep resolution inside the model's existing public operations. Resolve distinct catalog references together for a selection batch; avoid one lookup per purchase or a new catalog cache/registry service.
- Remove or adapt the old embedded discriminator storage where it requires a persisted enum field. Ensure both user and admin payloads survive MongoDB round trips; simply removing discriminator registrations while leaving a schema that drops payload fields is insufficient.
- This approach does not use the literal Mongoose option `discriminatorKey: 'setPlayId'`. Fixed catalog IDs or schema registration from database contents would require a separate explicit decision.

### Public contracts and validation

- Preserve the existing public operations: `getSetPlaysForUser`, `getSetPlaysForAdmin`, `saveSetPlays`, `updateSetPlay`, `removeSetPlay`, and `saveSetPlayResults`.
- Selection saves and edits accept `setPlayId` in place of client-supplied `name` and `type`, plus the existing purchase identity where applicable and the user payload. Reject obsolete metadata fields and user-submitted admin results.
- Validate that catalog IDs are present, well formed, and refer to existing entries before changing stored selections. Apply payload validation, player eligibility, and complete-round rules using the resolved catalog type.
- Continue counting purchase limits by the resolved enum type. Counting only catalog IDs must not permit bypassing a per-type limit if two catalog records share a type.
- Preserve the current 17 payload variants, six-play limit, independent reserve limits, non-reserve occurrence limits, round restrictions, player relationships, and admin-result rules. Missing business cases require later explicit requirements.
- `getSetPlaysForUser(startingLineupId)` queries selection data directly using the supplied ID. Populate the catalog reference and return only `name` and `userData`, defaulting absent user data to an empty object. Do not reintroduce an unnecessary lineup lookup.
- `getSetPlaysForAdmin(roundNumber, userId)` reuses the existing lineup lookup, then reads that lineup's selection data. Populate the catalog reference and return only `name` and `adminData`, defaulting absent admin data to an empty object.
- Both getters retain their existing empty-list behavior when no matching selection document exists; the admin getter also returns an empty list when no lineup exists.
- Use named query/populated-document types, explicit projections and population selections, and explicit DTO mapping consistent with the existing user and score-detail models. Populate `name` and `type` without adding them to the persisted selection shape or expanding the established getter responses.
- Mutation results retain purchase identity, catalog identity, and applicable payloads. Any existing returned name/type values must be derived from the catalog, not copied into storage.
- An unchanged catalog reference and unchanged user inputs preserve purchase identity and admin results. Changing user inputs preserves the purchase identity and clears that purchase's results. Switching catalog references is a replacement purchase with a new identity and no admin results, even if the two catalog records have the same enum type.
- Preserve order, unrelated purchases, and results when saving, editing, or removing entries. An invalid operation must leave the previously saved selection intact.
- Resolve the catalog type from the saved purchase when validating admin results. Do not accept a replacement catalog reference or user-input changes through the admin-result operation.
- Report a clear integrity error if a saved purchase points to a missing catalog entry. Do not silently drop the purchase, invent its name/type, or confuse it with an empty selection. Catalog deletion and type changes are outside this step.

### Incremental implementation and project practices

1. Add the minimal catalog model and real catalog fixtures for the supported enum variants.
2. Rename the selection module and update affected imports, types, references, and tests without unrelated cleanup.
3. Replace embedded metadata with catalog references; connect resolution, existing validation, and population to the public methods.
4. Update tests to use real catalog IDs and verify persistence and public read/write behavior.
5. Run the focused model tests, TypeScript checking, and linting of changed modules.

Follow KISS, YAGNI, and the repository's reuse-first approach. Prefer ordinary functions and direct queries; remove obsolete metadata copying and discriminator plumbing as its replacement becomes functional. Keep control-flow braces, explicit multiline returns, descriptive names, and the diff limited to this refactor. Do not introduce generic repositories, schema factories, or compatibility layers for hypothetical callers.

## Testing Decisions

Use the previously agreed public model-method boundary against real MongoDB as the primary testing seam. The existing set-play and starting-lineup tests provide the fixture and persistence patterns. Create actual catalog documents as test fixtures and exercise the selected-play model through its public operations. Test the new catalog's simple schema through creation and validation; no new service or HTTP testing seam is needed.

A good test proves an observable selection rule, response contract, or persistence guarantee. Avoid assertions about helper call counts, discriminator registrations, or how many internal abstractions exist.

Required coverage:

- Catalog entries accept supported enum types and valid names and reject missing required fields or unsupported types.
- All 17 catalog types can be referenced, saved with their applicable inputs, and read back without payload loss. Required references are enforced even if a shared ObjectId schema is optional by default.
- Raw stored selections contain `setPlayId` and applicable payloads, without embedded `name`, `type`, or an extra enum discriminator field. A direct database assertion is appropriate because storage normalization is an explicit requirement.
- Malformed, absent, and unknown catalog IDs and payloads incompatible with the resolved type are rejected without partial writes.
- User and admin getters preserve their exact response shapes and obtain names from population. A catalog name edit is reflected on the next read without rewriting selected-play data.
- The user getter works from the supplied lineup ID; the admin getter distinguishes users and rounds. Missing selections and missing admin lookup lineups return empty lists as before.
- Two allowed purchases of one catalog play have distinct purchase IDs. Editing, removing, or recording results for one leaves the other intact.
- Existing complete-round, player-eligibility, required-input, and admin-result cases continue to pass using catalog fixtures. Per-type limits use the resolved enum rather than assuming catalog ID uniqueness per type.
- Unchanged saves and reorders preserve identities/results; changed user inputs clear only associated results; changing the catalog reference replaces only that purchase.
- User writes cannot supply names, types, or admin results; admin writes cannot switch the selected catalog play or edit user inputs.
- A dangling saved reference follows the explicit integrity-error policy and does not disappear from the response silently.
- The unique starting-lineup constraint remains effective and the two models persist in distinct collections.

Report unrelated baseline failures separately; the previously reported wheel `Infinity` test mismatch is not implicitly resolved by this refactor. Existing heat-result zero defaults and omitted checkbox defaults remain part of the implemented baseline.

## Out of Scope

- Unspecified missing game cases, altered purchase rules, and later simplification steps.
- Catalog management UI, new HTTP endpoints, authentication changes, scoring formulas, playoffs, and legacy free-text integration.
- Catalog seeding infrastructure, startup database queries for schema registration, hardcoded catalog IDs, and catalog caching.
- Catalog deletion, changing the type of an already referenced catalog entry, and historical catalog snapshots.
- Production data migration, automatic collection deletion/recreation, dual writes, and automatic conversion of existing selected-play documents.
- Broad helper/type rewrites, unrelated cleanup, and changes to the checkpoint branch.

## Further Notes

- The earlier implementation is preserved on `feature/MN-14-support-for-setplays-option-1` at checkpoint `93fd41d`; the continuing refactor belongs on `feature/MN-14-support-for-setplays`.
- The catalog must contain the intended definitions before real user selections can reference it. Test fixtures cover automated verification; the deployment/provisioning workflow is a later decision.
- Existing stored documents may use the old embedded metadata shape. The spec does not establish whether such records need migration. Inspect actual deployment requirements before rollout; this step does not authorize deleting them.
- No new glossary or ADR was found in the repository. Use the existing terms: starting lineup, catalog play, selected play/purchase, user data, and admin data.
- The reference-driven approach meets the normalization goal without database-dependent schema registration. Native ObjectId-keyed discriminator registration is not part of this implementation.
