# components/

> Per-family component specs. **One markdown per family**, not per variant.

## Granularity

A "family" groups variants that share structure and tokens. Examples:
- `buttons.md` covers Primary, Secondary, Tertiary, icon-only buttons (all with the same radius/typography conventions)
- `cards.md` covers Default and Feature variants
- `inputs.md` covers TextField, Select, Checkbox, Radio
- `feedback.md` covers Alert, Toast, Snackbar

Don't make per-variant files. Don't make per-page files (those go in `screen-inventory.md`).

## Spec template

Every file in this folder follows roughly this shape:

```markdown
# <Family Name>

> Variants: <Primary, Secondary, …>

## Quick reference
| Variant | Background | Text | Border |
|---------|------------|------|--------|
| ... | token ref | token ref | token ref |

## Common properties (all variants)
| Property | Value | Token |
|----------|-------|-------|
| Radius | … | `radius/...` |
| Font family | … | `font/...` |

## <Variant>
**Figma component:** `<exact Figma component name>`

### States
| State | Background | Text | Shadow |
|-------|------------|------|--------|
| Default | token | token | token |
| Hover | … | … | … |
| Active | … | … | … |
| Disabled | … | … | … |

### Sizes
| Size | Font | Line height | Padding | Gap | Icon |
|------|------|-------------|---------|-----|------|
| sm | … | … | … | … | … |
| base | … | … | … | … | … |
| lg | … | … | … | … | … |

### Props (if relevant for code)
| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `label` | string | required | |
```

## Rules

- Reference tokens **by name**, not raw values. The hex / px lives in `tokens/raw/`.
- The Figma component name must match exactly — `design-to-code` skill uses it to fetch the node.
- Implementation methodology (how to translate the spec into code) is in `~/.aionsoft/core/skills/design-to-code/SKILL.md`. This folder is **what**, the skill is **how**.
