# patterns/

> Cross-component patterns. Layouts, forms, transactional emails, recurring page structures — anything that combines multiple component families into a reusable shape.

## What goes here vs. components/

- `components/` — single component family (buttons, cards, inputs, …)
- `patterns/` — combinations (a form is buttons + inputs + feedback; a layout is grid + breakpoints + containers)

## Layout

Flat files for small concerns; sub-folders when content gets large.

```
patterns/
├── README.md                     ← this file (universal)
├── layouts.md                    ← page layouts, max-widths, breakpoints
├── forms.md                      ← form structure, field gaps, validation
├── email-templates.md            ← if project sends emails
└── emails/                       ← sub-folder if the project has many email templates
    ├── README.md
    ├── welcome.md
    └── password-reset.md
```

## Spec template

```markdown
# <Pattern Name>

> Short description (one line).

## Quick reference
| Property | Value | Token |
|----------|-------|-------|
| ... | ... | ... |

## Structure
(ASCII diagram or component tree showing how parts fit together)

## Rules
- Tokens used (link to `../design-tokens.md` or specific tokens)
- States or variants
- Constraints (e.g. "max width 1080px", "field gap 24px")
```

## Rules

- Reference component families by name (`buttons.md`, `inputs.md`) rather than restating their specs.
- Reference tokens by name, not raw values.
- Implementation methodology lives in `~/.aionsoft/core/skills/design-to-code/SKILL.md`.
