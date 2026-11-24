# Megaliga UX system

These layout conventions cover public pages and the Dashboard. The admin panel will be reviewed separately when it is implemented.

## Shared UI components

Reuse the shadcn/ui components in [`components/ui`](../components/ui) for controls they already cover. Use the shared [`Button`](../components/ui/button.tsx) for actions, including icon buttons and form submissions. Use Next.js `Link` for navigation and native semantic elements such as `<header>` and `<main>` for page structure.

## Responsive layout

Start with one column for page content. Switch to the desktop arrangement at Tailwind's `lg` breakpoint (64rem). Use the 402px mobile and 1440px desktop Figma frames as design references. Check dense content at narrower widths and check multiple columns just above `lg`, where they have the least room.

The [root layout](../app/layout.tsx) centers the shared content container with `mx-auto w-full max-w-6xl` and provides the page gutters. Wide sections fill that container. For narrow content, such as the Wyniki round overview, center an inner section with `mx-auto w-full max-w-xl`.

| View | Mobile | Desktop |
| --- | --- | --- |
| Dashboard | Stack sections in one column, with Centrum Akcji first. | Use two equal columns for the main widgets. Let the statistics chart and summary table each span both columns. |
| Drużyny | Stack team cards and use tabs to switch between rosters. | Stack wide team cards. Place team details and both rosters side by side inside each card. |
| Wyniki round overview | Use the available width for the schedule and results. | Center the schedule and results in a narrow column. |
| Tabela playoff | Stack bracket sections in reading order. | Use three columns, with the final between the semifinals and the third-place match below the final. |

## Flexbox and grid

Use flexbox for a simple row or stack of items that need to align or distribute space. Use grid when the layout depends on defined columns or rows. Choose the layout per container. A page can combine both.

The shared page shell uses a vertical flex layout to stack the header, main content, and footer, with the main content growing to fill available height. Use grid for page sections such as the Dashboard's two desktop columns and the playoff bracket's three columns. Use flex for simpler arrangements such as a row of navigation items or buttons.

## Spacing

Use Tailwind's default spacing scale. The page container owns the gutters. Use `gap-*` on the layout wrapper for space between its children, and use padding inside the card or panel for space around its content.

| Where | Below `lg` | At `lg` and above |
| --- | --- | --- |
| Page gutters | `px-2` (8px per side) | `px-6` (24px per side) |
| Between cards in a section | `gap-3` (12px) | `gap-6` (24px) |
| Inside regular cards | `p-4` (16px) | `p-6` (24px) |
| Between major sections | `gap-6` (24px) | `gap-8` (32px) |

Give dense data panels, such as mobile scores and tables, `px-2` (8px per side) inside the shared page gutters. In score rows, let team names wrap and keep the score on one line. If a table needs more width, allow horizontal scrolling inside its table wrapper so the page itself stays within the viewport. See [Mobile: Wyniki](https://www.figma.com/design/Nzgmj1y0LogZlQpy7pGh6q/megaliga-next?node-id=203-647) for the compact panel reference.
