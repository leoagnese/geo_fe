/**
 * TagInput — multi-value text input using MUI Autocomplete with freeSolo.
 *
 * Used for: aliases, settori, keywordsOverride (SC-011, SC-013, SC-020).
 * Implementation per forms.md §"Tag input pattern".
 *
 * @spec L1_design/patterns/forms.md §"Tag input pattern"
 */
'use client'

import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'

interface TagInputProps {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  options?: string[]  // constrained list (no freeSolo) if provided
  error?: boolean
  helperText?: string
  disabled?: boolean
}

/**
 * Renders an Autocomplete with multiple + freeSolo for free-text tags,
 * or multiple without freeSolo for constrained option lists.
 */
export default function TagInput({
  label,
  value,
  onChange,
  placeholder,
  options,
  error,
  helperText,
  disabled,
}: TagInputProps) {
  const isFreeSolo = !options

  return (
    <Autocomplete
      multiple
      freeSolo={isFreeSolo}
      options={options ?? []}
      value={value}
      onChange={(_event, newValue) => {
        onChange(newValue as string[])
      }}
      disabled={disabled}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index })
          return (
            <Chip
              key={key}
              label={option}
              size="small"
              {...tagProps}
            />
          )
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          size="small"
        />
      )}
    />
  )
}
