/**
 * SC-012b — Personas & Groups management for a domain.
 *
 * Left panel : individual personas catalog (add / delete)
 * Right panel: groups (create / delete / edit members)
 *
 * @implements US-017
 */
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import GroupIcon from '@mui/icons-material/Group'
import PersonIcon from '@mui/icons-material/Person'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import {
  getDomain,
  postDomainPersona,
  patchDomainPersona,
  deleteDomainPersona,
  postDomainPersonasBulk,
  postDomainPersonaGroup,
  deleteDomainPersonaGroup,
  patchDomainPersonaGroup,
  type Persona,
  type PersonaGroup,
} from '@/lib/api-client'

// ── Markdown parser ───────────────────────────────────────────

type PersonaDraft = { name: string; description: string; context: string; searchStyle?: string }

function extractMdField(section: string, ...labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|$)`, 'i')
    const m = section.match(re)
    if (m) return m[1].trim()
  }
  return ''
}

function parsePersonasFromMarkdown(md: string): PersonaDraft[] {
  const sections = md.split(/\n(?=##\s)/)
  return sections
    .map((s) => s.trim())
    .filter((s) => s.startsWith('##'))
    .map((s) => {
      const lines = s.split('\n')
      const name = lines[0].replace(/^##\s*/, '').trim()
      const description = extractMdField(s, 'Descrizione', 'Description')
      const context = extractMdField(s, 'Contesto', 'Context')
      const searchStyle = extractMdField(s, 'Search Style', 'Stile di ricerca') || undefined
      return { name, description, context, searchStyle }
    })
    .filter((p) => p.name && p.description && p.context)
}

interface Props {
  params: { clientKey: string }
}

export default function PersonasManagementPage({ params }: Props) {
  const { clientKey } = params
  const { data: session } = useSession()
  const token = session?.accessToken ?? ''
  const router = useRouter()
  const queryClient = useQueryClient()

  // ── Personas state ────────────────────────────────────────────
  const [openPersonaDialog, setOpenPersonaDialog] = useState(false)
  const [isAddingPersona, setIsAddingPersona] = useState(false)
  const [isRemovingPersona, setIsRemovingPersona] = useState<string | null>(null)
  const [personaFormError, setPersonaFormError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const contextRef = useRef<HTMLInputElement>(null)
  const searchStyleRef = useRef<HTMLInputElement>(null)

  // ── Groups state ──────────────────────────────────────────────
  const [openGroupDialog, setOpenGroupDialog] = useState(false)
  const [editingGroup, setEditingGroup] = useState<PersonaGroup | null>(null)
  const [groupName, setGroupName] = useState('')
  const [groupPersonaIds, setGroupPersonaIds] = useState<string[]>([])
  const [isSavingGroup, setIsSavingGroup] = useState(false)
  const [isRemovingGroup, setIsRemovingGroup] = useState<string | null>(null)
  const [groupFormError, setGroupFormError] = useState<string | null>(null)

  // ── Edit persona state ────────────────────────────────────────
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editContext, setEditContext] = useState('')
  const [editSearchStyle, setEditSearchStyle] = useState('')
  const [isSavingPersona, setIsSavingPersona] = useState(false)
  const [editPersonaError, setEditPersonaError] = useState<string | null>(null)

  // ── Bulk import state ─────────────────────────────────────────
  const [openImportDialog, setOpenImportDialog] = useState(false)
  const [importTab, setImportTab] = useState(0)
  const [importText, setImportText] = useState('')
  const [importParsed, setImportParsed] = useState<PersonaDraft[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // ── Data ──────────────────────────────────────────────────────
  const { data: domainData, isLoading } = useQuery({
    queryKey: ['domain', clientKey],
    queryFn: () => getDomain(token, clientKey),
    enabled: !!token,
  })

  const personas: Persona[] = (domainData?.data?.personas ?? []) as Persona[]
  const groups: PersonaGroup[] = (domainData?.data?.personaGroups ?? []) as PersonaGroup[]

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['domain', clientKey] })

  // ── Persona handlers ──────────────────────────────────────────
  async function handleAddPersona() {
    const name = nameRef.current?.value.trim() ?? ''
    const description = descRef.current?.value.trim() ?? ''
    const context = contextRef.current?.value.trim() ?? ''
    const searchStyle = searchStyleRef.current?.value.trim() ?? ''
    if (!name || !description || !context) {
      setPersonaFormError('Nome, descrizione e contesto sono obbligatori.')
      return
    }
    setPersonaFormError(null)
    setIsAddingPersona(true)
    try {
      await postDomainPersona(token, clientKey, { name, description, context, searchStyle: searchStyle || undefined })
      await invalidate()
      setOpenPersonaDialog(false)
    } catch (err) {
      setPersonaFormError(err instanceof Error ? err.message : 'Errore durante il salvataggio.')
    } finally {
      setIsAddingPersona(false)
    }
  }

  async function handleRemovePersona(personaId: string) {
    setIsRemovingPersona(personaId)
    try {
      await deleteDomainPersona(token, clientKey, personaId)
      await invalidate()
    } finally {
      setIsRemovingPersona(null)
    }
  }

  // ── Group handlers ────────────────────────────────────────────
  function openCreateGroup() {
    setEditingGroup(null)
    setGroupName('')
    setGroupPersonaIds([])
    setGroupFormError(null)
    setOpenGroupDialog(true)
  }

  function openEditGroup(group: PersonaGroup) {
    setEditingGroup(group)
    setGroupName(group.name)
    setGroupPersonaIds([...group.personaIds])
    setGroupFormError(null)
    setOpenGroupDialog(true)
  }

  function toggleGroupPersona(id: string) {
    setGroupPersonaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSaveGroup() {
    if (!groupName.trim()) {
      setGroupFormError('Il nome del gruppo è obbligatorio.')
      return
    }
    if (groupPersonaIds.length === 0) {
      setGroupFormError('Seleziona almeno una persona.')
      return
    }
    setGroupFormError(null)
    setIsSavingGroup(true)
    try {
      if (editingGroup) {
        await patchDomainPersonaGroup(token, clientKey, editingGroup.id, { name: groupName.trim(), personaIds: groupPersonaIds })
      } else {
        await postDomainPersonaGroup(token, clientKey, { name: groupName.trim(), personaIds: groupPersonaIds })
      }
      await invalidate()
      setOpenGroupDialog(false)
    } catch (err) {
      setGroupFormError(err instanceof Error ? err.message : 'Errore durante il salvataggio.')
    } finally {
      setIsSavingGroup(false)
    }
  }

  async function handleRemoveGroup(groupId: string) {
    setIsRemovingGroup(groupId)
    try {
      await deleteDomainPersonaGroup(token, clientKey, groupId)
      await invalidate()
    } finally {
      setIsRemovingGroup(null)
    }
  }

  // ── Edit persona handlers ─────────────────────────────────────
  function openEditPersona(p: Persona) {
    setEditingPersona(p)
    setEditName(p.name)
    setEditDescription(p.description)
    setEditContext(p.context)
    setEditSearchStyle(p.searchStyle ?? '')
    setEditPersonaError(null)
  }

  async function handleSavePersona() {
    if (!editName.trim() || !editDescription.trim() || !editContext.trim()) {
      setEditPersonaError('Nome, descrizione e contesto sono obbligatori.')
      return
    }
    if (!editingPersona) return
    setEditPersonaError(null)
    setIsSavingPersona(true)
    try {
      await patchDomainPersona(token, clientKey, editingPersona.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        context: editContext.trim(),
        searchStyle: editSearchStyle.trim() || undefined,
      })
      await invalidate()
      setEditingPersona(null)
    } catch (err) {
      setEditPersonaError(err instanceof Error ? err.message : 'Errore durante il salvataggio.')
    } finally {
      setIsSavingPersona(false)
    }
  }

  // ── Bulk import handlers ──────────────────────────────────────
  function openImport() {
    setImportTab(0)
    setImportText('')
    setImportParsed([])
    setImportError(null)
    setOpenImportDialog(true)
  }

  function handleImportTextChange(text: string) {
    setImportText(text)
    setImportError(null)
    if (!text.trim()) { setImportParsed([]); return }
    try {
      if (importTab === 0) {
        const arr = JSON.parse(text)
        if (!Array.isArray(arr)) throw new Error('Il JSON deve essere un array.')
        const valid = arr.filter((x) => x.name && x.description && x.context)
        if (valid.length === 0) throw new Error('Nessuna persona valida trovata. Ogni elemento deve avere name, description e context.')
        setImportParsed(valid)
      } else {
        const parsed = parsePersonasFromMarkdown(text)
        if (parsed.length === 0) throw new Error('Nessuna persona trovata. Usa "## Nome Persona" come separatore con **Descrizione:**, **Contesto:**.')
        setImportParsed(parsed)
      }
    } catch (e) {
      setImportParsed([])
      setImportError(e instanceof Error ? e.message : 'Formato non valido.')
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setImportText(text)
      handleImportTextChange(text)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleConfirmImport() {
    if (importParsed.length === 0) return
    setIsImporting(true)
    setImportError(null)
    try {
      await postDomainPersonasBulk(token, clientKey, importParsed)
      await invalidate()
      setOpenImportDialog(false)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Errore durante l\'importazione.')
    } finally {
      setIsImporting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', pb: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <IconButton size="small" onClick={() => router.push(`/domains/${clientKey}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h1">Gestione Personas</Typography>
          <Typography variant="caption" color="text.secondary">{clientKey}</Typography>
        </Box>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Skeleton variant="rounded" height={400} />
          <Skeleton variant="rounded" height={400} />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, alignItems: 'start' }}>

          {/* ══ LEFT: Personas catalog ══ */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="h2" sx={{ fontSize: '1rem' }}>
                  Personas
                </Typography>
                <Chip label={personas.length} size="small" sx={{ height: 18, fontSize: 10 }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                  onClick={openImport}
                >
                  Importa
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => { setPersonaFormError(null); setOpenPersonaDialog(true) }}
                >
                  Aggiungi
                </Button>
              </Box>
            </Box>

            {personas.length === 0 ? (
              <Card sx={{ border: '1px dashed', borderColor: 'divider', boxShadow: 'none' }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.disabled" mb={1.5}>
                    Nessuna persona configurata
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button variant="outlined" size="small" startIcon={<UploadFileIcon />} onClick={openImport}>
                      Importa in bulk
                    </Button>
                    <Button variant="outlined" size="small" startIcon={<AddIcon />}
                      onClick={() => { setPersonaFormError(null); setOpenPersonaDialog(true) }}>
                      Aggiungi una persona
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {personas.map((p) => (
                  <Card key={p.id} variant="outlined" sx={{ boxShadow: 'none' }}>
                    <CardContent sx={{ p: '12px 16px !important', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={700}>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                          {p.description.length > 100 ? p.description.slice(0, 100) + '…' : p.description}
                        </Typography>
                        {p.searchStyle && (
                          <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
                            Style: {p.searchStyle}
                          </Typography>
                        )}
                        {/* Show which groups include this persona */}
                        {groups.filter((g) => g.personaIds.includes(p.id)).length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.75 }}>
                            {groups.filter((g) => g.personaIds.includes(p.id)).map((g) => (
                              <Chip key={g.id} label={g.name} size="small"
                                sx={{ height: 16, fontSize: '0.625rem', bgcolor: 'primary.50', color: 'primary.main' }} />
                            ))}
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', flexShrink: 0 }}>
                        <IconButton
                          size="small"
                          onClick={() => openEditPersona(p)}
                          sx={{ color: 'text.secondary' }}
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleRemovePersona(p.id)}
                          disabled={isRemovingPersona === p.id}
                          sx={{ color: 'error.main' }}
                        >
                          {isRemovingPersona === p.id
                            ? <CircularProgress size={14} color="inherit" />
                            : <DeleteIcon sx={{ fontSize: 16 }} />}
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>

          {/* ══ RIGHT: Groups ══ */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="h2" sx={{ fontSize: '1rem' }}>
                  Gruppi
                </Typography>
                <Chip label={groups.length} size="small" sx={{ height: 18, fontSize: 10 }} />
              </Box>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreateGroup}
                disabled={personas.length === 0}
              >
                Nuovo gruppo
              </Button>
            </Box>

            {personas.length === 0 ? (
              <Card sx={{ border: '1px dashed', borderColor: 'divider', boxShadow: 'none' }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.disabled">
                    Aggiungi prima alcune personas per poter creare un gruppo.
                  </Typography>
                </CardContent>
              </Card>
            ) : groups.length === 0 ? (
              <Card sx={{ border: '1px dashed', borderColor: 'divider', boxShadow: 'none' }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.disabled" mb={1.5}>
                    Nessun gruppo creato
                  </Typography>
                  <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={openCreateGroup}>
                    Crea il primo gruppo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {groups.map((g) => {
                  const members = personas.filter((p) => g.personaIds.includes(p.id))
                  return (
                    <Card key={g.id} variant="outlined" sx={{ boxShadow: 'none' }}>
                      <CardContent sx={{ p: '12px 16px !important' }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{g.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {members.length} persona{members.length !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" onClick={() => openEditGroup(g)} sx={{ color: 'text.secondary' }}>
                              <EditIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveGroup(g.id)}
                              disabled={isRemovingGroup === g.id}
                              sx={{ color: 'error.main' }}
                            >
                              {isRemovingGroup === g.id
                                ? <CircularProgress size={14} color="inherit" />
                                : <DeleteIcon sx={{ fontSize: 15 }} />}
                            </IconButton>
                          </Box>
                        </Box>
                        <Divider sx={{ mb: 1 }} />
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {members.map((p) => (
                            <Chip key={p.id} label={p.name} size="small"
                              sx={{ height: 20, fontSize: '0.6875rem' }} />
                          ))}
                          {members.length === 0 && (
                            <Typography variant="caption" color="text.disabled">Nessuna persona associata</Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  )
                })}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* ── Bulk Import Dialog ── */}
      <Dialog open={openImportDialog} onClose={() => setOpenImportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Importa personas in bulk</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Tabs value={importTab} onChange={(_e, v) => { setImportTab(v); setImportText(''); setImportParsed([]); setImportError(null) }} sx={{ mb: 2 }}>
            <Tab label="Incolla JSON" />
            <Tab label="Markdown" />
          </Tabs>

          {importTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Incolla un array JSON. Campi: <code>name*</code>, <code>description*</code>, <code>context*</code>, <code>searchStyle</code> (opzionale).
              </Typography>
              <TextField
                multiline
                rows={8}
                fullWidth
                size="small"
                value={importText}
                onChange={(e) => handleImportTextChange(e.target.value)}
                placeholder={`[\n  {\n    "name": "Turista Culturale",\n    "description": "Donna 35enne, appassionata di arte…",\n    "context": "Sei Giulia, una turista di 35 anni…",\n    "searchStyle": "musei torino, tour guidati…"\n  }\n]`}
                inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }}
              />
            </Box>
          )}

          {importTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Formato: <code>## Nome Persona</code> come separatore, poi <code>**Descrizione:**</code>, <code>**Contesto:**</code>, <code>**Search Style:**</code> (opzionale).
                </Typography>
                <Button
                  component="label"
                  size="small"
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                >
                  Carica file .md
                  <input type="file" accept=".md,.txt" hidden onChange={handleFileUpload} />
                </Button>
              </Box>
              <TextField
                multiline
                rows={8}
                fullWidth
                size="small"
                value={importText}
                onChange={(e) => handleImportTextChange(e.target.value)}
                placeholder={`## Turista Culturale\n\n**Descrizione:** Donna 35enne, appassionata di arte e musei.\n\n**Contesto:** Sei Giulia, una turista di 35 anni che visita Torino per un city break culturale.\n\n**Search Style:** musei torino, tour guidati arte, mostre temporanee\n\n## Business Traveler\n\n**Descrizione:** Manager 45enne, viaggia frequentemente per lavoro.\n\n**Contesto:** Sei Marco, un manager che cerca soluzioni rapide ed efficienti.\n\n**Search Style:** hotel business torino, sala riunioni centro`}
                inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }}
              />
            </Box>
          )}

          {importError && <Alert severity="error" sx={{ mt: 2 }}>{importError}</Alert>}

          {importParsed.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" fontWeight={600} mb={1}>
                Anteprima — {importParsed.length} persona{importParsed.length !== 1 ? 's' : ''} pronte all&apos;importazione
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 220, overflowY: 'auto' }}>
                {importParsed.map((p, i) => (
                  <Card key={i} variant="outlined" sx={{ boxShadow: 'none' }}>
                    <CardContent sx={{ p: '8px 12px !important' }}>
                      <Typography variant="body2" fontWeight={700}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ whiteSpace: 'pre-wrap' }}>
                        {p.description}
                      </Typography>
                      {p.searchStyle && (
                        <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
                          Style: {p.searchStyle}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImportDialog(false)}>Annulla</Button>
          <Button
            variant="contained"
            onClick={handleConfirmImport}
            disabled={importParsed.length === 0 || isImporting}
            startIcon={isImporting ? <CircularProgress size={14} color="inherit" /> : <UploadFileIcon />}
          >
            {isImporting ? 'Importazione…' : `Importa ${importParsed.length > 0 ? importParsed.length : ''} personas`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Persona Dialog ── */}
      <Dialog open={!!editingPersona} onClose={() => setEditingPersona(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifica persona</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {editPersonaError && <Alert severity="error">{editPersonaError}</Alert>}
          <TextField
            label="Nome *"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Descrizione *"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={3}
          />
          <TextField
            label="Contesto *"
            value={editContext}
            onChange={(e) => setEditContext(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={3}
          />
          <TextField
            label="Search Style (opzionale)"
            value={editSearchStyle}
            onChange={(e) => setEditSearchStyle(e.target.value)}
            fullWidth
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingPersona(null)}>Annulla</Button>
          <Button variant="contained" onClick={handleSavePersona} disabled={isSavingPersona}>
            {isSavingPersona ? 'Salvataggio…' : 'Salva modifiche'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Persona Dialog ── */}
      <Dialog open={openPersonaDialog} onClose={() => setOpenPersonaDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuova persona</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {personaFormError && <Alert severity="error">{personaFormError}</Alert>}
          <TextField label="Nome *" inputRef={nameRef} fullWidth size="small"
            placeholder="es. Turista Arte e Cultura – City Break" />
          <TextField label="Descrizione *" inputRef={descRef} fullWidth size="small" multiline rows={3}
            placeholder="Profilo demografico, motivazioni, comportamento di ricerca…" />
          <TextField label="Contesto *" inputRef={contextRef} fullWidth size="small" multiline rows={3}
            placeholder="In prima persona: 'Sei Mario, 45 anni…'" />
          <TextField label="Search Style (opzionale)" inputRef={searchStyleRef} fullWidth size="small"
            placeholder="Query tipiche usate da questa persona" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPersonaDialog(false)}>Annulla</Button>
          <Button variant="contained" onClick={handleAddPersona} disabled={isAddingPersona}>
            {isAddingPersona ? 'Aggiunta…' : 'Aggiungi'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Create / Edit Group Dialog ── */}
      <Dialog open={openGroupDialog} onClose={() => setOpenGroupDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingGroup ? 'Modifica gruppo' : 'Nuovo gruppo'}</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {groupFormError && <Alert severity="error">{groupFormError}</Alert>}
          <TextField
            label="Nome gruppo *"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            fullWidth
            size="small"
            placeholder="es. Turisti culturali, Business travelers…"
          />
          <Box>
            <Typography variant="body2" fontWeight={600} mb={1}>
              Personas incluse *
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 280, overflowY: 'auto' }}>
              {personas.map((p) => (
                <FormControlLabel
                  key={p.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={groupPersonaIds.includes(p.id)}
                      onChange={() => toggleGroupPersona(p.id)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.description.slice(0, 60)}…</Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', '& .MuiFormControlLabel-label': { mt: 0.25 } }}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGroupDialog(false)}>Annulla</Button>
          <Button variant="contained" onClick={handleSaveGroup} disabled={isSavingGroup}>
            {isSavingGroup ? 'Salvataggio…' : editingGroup ? 'Salva modifiche' : 'Crea gruppo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
