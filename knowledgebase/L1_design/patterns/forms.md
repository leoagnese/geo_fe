# Forms

> Cross-screen form patterns for Geo-SmartAudit Platform.
> Applies to: SC-011 (Create domain), SC-013 (Edit domain), SC-020 (New run configurator),
> SC-040 (User management drawer), SC-042 (LLM profile drawer).

## Form structure

All forms use MUI `TextField`, `Select`, `Autocomplete`, and `Switch` components.
Field spacing: `spacing.3` (24px) between fields vertically.
Section spacing (required vs optional groups): `spacing.6` (48px) with a `Divider`.

## Validation pattern

- **FE-side (inline):** Validate on blur (not on keystroke). Show error message below the
  field using `TextField helperText` prop in error state. Font: `text.scale.caption`,
  color: `color.status.error`.
- **FE-side (on submit):** Re-validate all required fields before dispatching API call.
  If validation fails, scroll to first invalid field.
- **BE-side (async):** On 409 Conflict or 422 Unprocessable from BE, map error fields to
  inline messages. Show a summary toast only for non-field errors.
- **Async uniqueness check:** clientKey field (SC-011) — fire a debounced GET on blur
  after min 3 chars. Show spinner in field suffix while in-flight. Show inline error if
  conflict returned.

## Required vs optional fields

- Required fields: no asterisk (asterisks are visual noise). Instead, optional fields are
  labelled with "(facoltativo)" in the field label.
- The optional section in SC-020 is behind a collapsible `Accordion` component.
  Default: collapsed. Label: "Opzioni avanzate".

## Tag input pattern

Used for: aliases (SC-011, SC-013), settori (SC-011, SC-013), keywords override (SC-020),
clientKeys multi-assign (SC-040).
Implementation: MUI `Autocomplete` with `multiple` + `freeSolo` where free-text entry is
needed (aliases, keywords), or `multiple` without `freeSolo` for constrained lists (settori,
clientKeys drawn from existing domains list).

## Submit / cancel buttons

- Primary action button: MUI `Button variant="contained"` in `color.brand.primary`.
  Label: context-specific ("Crea dominio", "Salva modifiche", "Avvia run").
- Cancel / back: MUI `Button variant="text"` in `color.neutral.text.secondary`.
  Navigates back without saving. No confirmation dialog unless the form has unsaved changes
  (OQ-DESIGN-011 — dirty-state guard).
- Button pair always at the bottom of the form, right-aligned on desktop, full-width stacked
  on mobile.

## Confirmation toasts

On successful create/update: MUI `Snackbar` with `Alert severity="success"`, auto-dismiss
after 4s. Position: bottom-right on desktop, bottom-centre on mobile.
On system error: `Alert severity="error"`, manual dismiss (no auto-close), with retry button
if the action is idempotent.
