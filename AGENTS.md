<!-- CODEGRAPH_START -->

## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell**: `codegraph explore "<symbol names or question>"` prints the same output. If the CLI is absent from `PATH`, use `~/.local/bin/codegraph`.

Use `rg` and direct file reads when CodeGraph has no match or reports stale source.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.

<!-- CODEGRAPH_END -->

## Git commits

Automatic commits are not allowed. Leave changes uncommitted unless the user explicitly requests a commit. Invoking a skill or workflow that includes a commit step does not count as permission to commit.

## Code quality principles

Apply these before any of the pattern rules below. They decide _whether_ and _how much_ code to write; the sections after decide its shape.

- **KISS.** The simplest solution that works is the right one. Prefer a plain function over a class, a literal over a builder, a conditional over a strategy map, native platform features (CSS, `<dialog>`, `<input type>`, `Intl`) over JS or a library. Clever code is what someone decodes at 3am.
- **YAGNI.** Build what the task asks for, nothing for a hypothetical later. No config for a value that never changes, no interface with one implementation, no `X_TOKENS` entry or extension point without a second consumer, no optional prop nobody passes. Speculative need = skip it and say so in one line.
- **DRY, in this order.** Before writing: look for an existing helpers instead of writing same code over, and over again. Reuse it. Duplicating something three files away is the most common slop. But do not abstract two things that merely look alike today; a wrong abstraction costs more than a duplicated line. Extract on the third real repetition, not the second.
- **Clean code.**
  - Names say what, not how: `isCartEmpty`, `handleAddToCart`, `getProductBySlug`. No abbreviations, no `data2`, no `temp`.
  - Functions do one thing, read top-down, and take at most a few parameters; pass an options object beyond three. Early return over nested `if`.
  - Use braces (`{ ... }`) for control-flow bodies. Every `if`, `else if`, and `else` body must use `{ ... }`, including single-line early returns. Arrow functions returning a single-line expression may omit the block and `return`; use block bodies with explicit `return` statements for multiline expressions.
  - No magic numbers or strings: named constants in `x.constants.ts`, TTLs from config, URLs from `theme().urls`.
  - Comments explain _why_ (a workaround, a backend quirk, a ticket), never _what_ the code already says. Delete commented-out code; git remembers it.
  - Keep the diff minimal: touch only what the task needs, do not reformat or "improve" neighbouring code, do not rename things in passing.
  - Deletion beats addition. Removing dead code, an unused prop or an unnecessary layer is a valid and welcome change.
