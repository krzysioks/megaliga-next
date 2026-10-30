---
name: figma-design
description: Edit the project's Figma designs through the existing browser UI.
disable-model-invocation: true
---

# Figma design

Use this skill when the user asks to inspect or change this project's Figma file.

1. Connect Chrome DevTools to the user's existing Chrome session. Use `list_pages` and select the Figma tab the user identified; do not open another browser or tab.
2. Inspect the current frame and nearby layers before editing. Reuse existing typography, colors, spacing, and components.
3. Make requested changes through visible Figma editor controls and keyboard shortcuts. Keep edits small and within the named frame. Do not use plugins, Figma APIs, page scripts, or hidden editor state.
4. Take a fresh snapshot or screenshot after editing. Confirm the new layers and visual placement, then leave the user's Figma tab open.
5. Report which frames changed and any design decision that still needs the user's review.
