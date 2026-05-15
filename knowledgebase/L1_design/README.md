# L1 — Design

> **Universal contract.** This README is the same in every AionSoft project. The structure is shared; the content is project-specific.
>
> Frozen in Sprint 1, populated in Sprint 2 by the `designer` platform agent (with the project's frontend implementer agent as code-side partner).
>
> **In multi-repo products** (e.g. `<client>-be` + `<client>-fe`): per ADR-001 (KB-split model G), `L1_design/` lives in the **FE consumer repo** while `L0_identity` + `L1_requirements/` live in the canonical (BE) repo. The FE reads the canonical KB read-only via `.kb-source`. See `~/.aionsoft/memory/architectural-decisions/001-kb-layer-ownership.md`.

---

## Folder map

| Path | Universal? | Purpose |
|------|------------|---------|
| `README.md` | yes — master copy at `~/.aionsoft/core/templates/project-knowledgebase/L1_design/README.md` | This contract |
| `design-tokens.md` | universal contract, project content | High-level project token map: which collections exist, naming conventions used, source-of-truth path |
| `screen-inventory.md` | universal contract, project content | Every screen with `implements: US-XXX, AC-YYY` |
| `states-and-empty.md` | universal contract, project content | Empty / loading / error states per screen |
| `figma-links.md` | universal contract, project content | Canonical Figma file URL + frame anchors per screen |
| `project-bindings.md` | universal contract, project content | Stack-specific values: theme path, framework + version, import alias, Figma fileKey, default nodeId |
| `tokens/` | universal folder | Raw Figma exports (JSON) and any project-side transformations |
| `tokens/raw/` | universal folder | The Figma JSON exports — **canonical source of truth for token values** |
| `tokens/README.md` | universal | Convention for this folder |
| `components/` | universal folder | One spec per component family (buttons, cards, inputs, …) |
| `components/README.md` | universal | Convention for component specs |
| `patterns/` | universal folder | Cross-component patterns; sub-folders OK (`layouts/`, `forms/`, `emails/`, …) |
| `patterns/README.md` | universal | Convention for pattern specs |

The five top-level `.md` files are the **contract**. The three subfolders are universal *containers* whose contents are project-specific.

---

## The contract — what each file must contain

### `design-tokens.md`
A **map**, not a redeclaration. Lists which token collections exist for this project (Colors, Spacing, Typography, Radius, Shadows, …), where the canonical values live (`tokens/raw/*.json`), and which naming convention this project uses (figma-mirror / shorthand / semantic — see `design-to-code` skill). Does **not** restate the universal token taxonomy — that lives in the `idea-to-design` skill.

### `screen-inventory.md`
Every screen in the project, one row each, with at minimum: screen name, route/path, `implements: US-XXX, AC-YYY`. **A screen with no traceability ID fails the design-consistency check.**

### `states-and-empty.md`
For every screen in `screen-inventory.md`: how it looks empty, how it looks loading, how it looks on error. Reference the Figma frame for each state (link to `figma-links.md` entries).

### `figma-links.md`
Canonical Figma file URL(s) and frame anchors (node IDs) per screen. Used by `idea-to-design` and `design-to-code` skills to fetch the right nodes.

### `project-bindings.md`
The bridge between the design system and this project's code. Required keys:
- `framework` (e.g. `next@15.5`, `vite@5`, `wordpress@6.4`)
- `ui_library` (e.g. `mui@7`, `chakra@2`, `tailwind@3`, `none`)
- `theme_path` (e.g. `src/theme/index.ts`, `assets/css/tokens.css`)
- `import_alias` (e.g. `@/theme`, `~/styles`, `none`)
- `figma_file_key`
- `default_node_id`
- `naming_convention` (figma-mirror / shorthand / semantic)
- `token_export_format` (CSS custom properties / TS object / SCSS variables / …)

---

## Subfolders — what goes inside

### `tokens/`
- `raw/` — Figma JSON exports, **untouched**, one file per collection. Audit trail and re-import source.
- Optional siblings: any project-side transformations (e.g. `text-styles.md` for project-specific font preset documentation, `tokens.css` if generated, etc.)

### `components/`
One markdown per component **family**, not per variant. Convention:

```
components/
├── buttons.md      # Primary / Secondary / Tertiary / icon-only
├── cards.md        # Default / Feature / etc.
├── inputs.md       # TextField / Select / Checkbox / etc.
├── feedback.md     # Alert / Toast / Snackbar / etc.
└── ...
```

Each file documents: Figma component name → states table → tokens used → sizes table → props. See `components/README.md` for the template.

### `patterns/`
Cross-component patterns. Sub-folders permitted when content gets large:

```
patterns/
├── layouts.md      # Page layouts, max-widths, breakpoints
├── forms.md        # Form structure, validation
├── email-templates.md   # or emails/ subfolder if many
└── ...
```

---

## Methodology lives upstream — never restate it here

How to actually do design and design-to-code work is documented **once**, in the platform skills. This README points; it does not duplicate.

| Need | Skill |
|------|-------|
| Token taxonomy, 8px grid, auto-layout, Variables → Styles → Components order, naming | `~/.aionsoft/core/skills/idea-to-design/SKILL.md` |
| Figma → code translation, token export, parity checks, tech-stack detection | `~/.aionsoft/core/skills/design-to-code/SKILL.md` |
| Enforcement: no hex / no px in code; substitute every hardcoded value with a token | `~/.aionsoft/core/skills/hardcode-to-variables/SKILL.md` |

These skills are symlinked into every bootstrapped project at `.claude/skills/` and are auto-loaded by Claude Code.

---

## Agents that read or write this folder

- **`designer`** (platform sub-agent, symlinked at `.claude/agents/designer`) — produces the four contract files (`design-tokens.md`, `screen-inventory.md`, `states-and-empty.md`, `figma-links.md`) during Sprint 2 fan-out.
- **Project frontend implementer** — a project-local agent (e.g. `nextjs-frontend-architect`, `wp-frontend-architect`) that **consumes** this folder to produce code. It reads `project-bindings.md` for stack values and writes nothing here.

The frontend implementer agent invokes the three platform skills above; it does not restate their methodology.

---

## Source of truth

For tokens: `tokens/raw/*.json`. The Figma file referenced in `figma-links.md` is upstream of `tokens/raw/`; whenever Figma variables change, re-export to `tokens/raw/` and the rest of the project follows.

For screens: the Figma file. `screen-inventory.md`, `states-and-empty.md`, and `figma-links.md` are derived views.

`design-tokens.md` and `project-bindings.md` are **maps**, not sources — they describe where things live and how they connect.

---

## Traceability rule

Every screen in `screen-inventory.md` **must cite the US/AC IDs it implements**. A screen with no traceability is rejected by the `design-consistency` validator (Sprint 2). Components and patterns inherit traceability from the screens that use them.

---

## How to populate this folder in a new project (Sprint 2)

1. Run `designer` agent → it pulls Figma data and writes the four contract files.
2. Hand-author `project-bindings.md` from the project's stack (the project's frontend implementer agent has these values already; copy them here).
3. Drop Figma JSON exports into `tokens/raw/`.
4. As you build components, document each family in `components/`.
5. As you discover reusable patterns, document each in `patterns/`.

Validation: `design-consistency` checker runs against the contract files.
