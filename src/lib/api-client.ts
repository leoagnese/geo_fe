/**
 * Typed API client for the Geo-SmartAudit backend.
 *
 * All functions: fetch with Authorization: Bearer token, return typed response,
 * throw ApiError on non-2xx.
 *
 * Base URL from NEXT_PUBLIC_API_BASE_URL env var.
 *
 * @spec L1_backend/api-contracts.md
 * @implements US-003, US-004, US-005, US-006, US-007, US-008, US-009, US-010,
 *             US-013, US-014, US-015, US-016, US-017, US-023, US-024, US-025
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1'

// ──────────────────────────────────────────────────────────────
// Shared types (response envelope + error)
// ──────────────────────────────────────────────────────────────

export interface ApiMeta {
  page: number
  limit: number
  total: number
  /** Ranking only: raw brand spellings merged into others (see brand unification). */
  mergedNames?: number
}

export interface ApiSuccess<T> {
  data: T
  meta?: ApiMeta
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    field?: string
  }
}

export class ApiError extends Error {
  public readonly status: number
  public readonly code: string
  public readonly field?: string

  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.error.code
    this.field = body.error.field
  }
}

// ──────────────────────────────────────────────────────────────
// Domain types
// ──────────────────────────────────────────────────────────────

export interface Domain {
  _id: string
  clientKey: string
  targetDomain: string
  brand: string
  aliases?: string[]
  keywords?: string[]
  personas?: Persona[]
  personaGroups?: PersonaGroup[]
  brandRegistry?: BrandRegistryEntry[]
  ownerId?: string
  createdAt: string
  updatedAt?: string
}

export interface CreateDomainDto {
  clientKey: string
  targetDomain: string
  brand: string
  aliases?: string[]
  keywords?: string[]
}

export interface UpdateDomainDto {
  targetDomain?: string
  brand?: string
  aliases?: string[]
  keywords?: string[]
}

// ──────────────────────────────────────────────────────────────
// Run types
// ──────────────────────────────────────────────────────────────

export type RunStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled'

export interface RunPersona {
  id: string
  name: string
  description: string
  context: string
  searchStyle?: string
}

export interface Run {
  runId: string
  clientKey: string
  profileKey: string
  targetDomain?: string
  brand?: string
  targetUrl?: string | null
  status: RunStatus
  queuePosition?: number
  queueLength?: number
  runIterations: number
  locales?: string[]
  keywordsOverride?: string[]
  keywordsByLang?: Record<string, string[]>
  questionsCountByLang?: Record<string, number>
  locationFocusByLang?: Record<string, string>
  activePersonaIds?: string[]
  personas?: RunPersona[]
  topics?: Array<{ id: string; label: string; keywords?: string[] }>
  gotQueries?: boolean
  /** Custom-query runs: the rows executed, per language. */
  queries?: Record<string, Array<{ keyword: string; query: string; topicId?: string; intent?: string; personaId?: string }>>
  testMode: boolean
  debugMode: boolean
  profileSnapshot?: Record<string, unknown>
  executionId?: string | null
  plannedQueries: number
  doneQueries: number
  errorQueries: number
  errorMessage?: string | null
  reportFolderId?: string | null
  debugLog?: string[]
  startedAt?: string
  completedAt?: string | null
  createdAt: string
}

export interface RunTopic {
  id: string
  label: string
  keywords?: string[]
}

export interface CreateRunDto {
  profileKey: string
  runIterations: number
  targetUrl?: string
  locales?: string[]
  keywordsOverride?: string[]
  keywordsByLang?: Record<string, string[]>
  questionsCountByLang?: Record<string, number>
  activePersonaIds?: string[]
  locationFocusByLang?: Record<string, string>
  topics?: Array<{ id: string; label: string; keywords?: string[] }>
  testMode?: boolean
  debugMode?: boolean
  /** Custom-query mode: n8n skips QGen and runs `queries` as given. */
  gotQueries?: boolean
  queries?: Record<string, Array<{ keyword: string; query: string; topicId?: string; intent?: string; personaId?: string }>>
  customQueryDefaultPersonaId?: Record<string, string>
}

export interface Persona {
  id: string
  name: string
  description: string
  context: string
  searchStyle?: string
}

export interface PersonaGroup {
  id: string
  name: string
  personaIds: string[]
}

export interface RunListItem {
  runId: string
  clientKey: string
  profileKey: string
  status: RunStatus
  runIterations: number
  plannedQueries: number
  doneQueries: number
  errorQueries: number
  startedAt?: string
  completedAt?: string | null
  /** Set when the run is a section of a campaign. */
  campaignId?: string | null
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// Results types
// ──────────────────────────────────────────────────────────────

export interface RunKpis {
  runId: string
  targetBrand: string
  aiVisibilityScore: number
  avgRankPosition: number | null
  linkRate: number
  sentimentPositive: number
  sentimentNeutral: number
  sentimentNegative: number
  totalMentions: number
  totalQueries: number
}

export interface BrandRankRow {
  rank: number
  brand: string
  aiVisibilityScore: number
  /** All appearances: citations + mentionsOnly. */
  totalMentions: number
  /** Appearances with a link attached to the brand. */
  citations: number
  /** Appearances naming the brand without any link. */
  mentionsOnly: number
  /** Raw spellings merged into this brand, most frequent first. */
  variants?: string[]
  avgRankPosition: number | null
  linkRate: number
  sentimentPositive: number
  sentimentNeutral: number
  sentimentNegative: number
}

export interface TargetBrandRow {
  brand: string
  aiVisibilityScore: number
  /** All appearances: citations + mentionsOnly. */
  totalMentions: number
  /** Appearances with a link attached to the brand. */
  citations: number
  /** Appearances naming the brand without any link. */
  mentionsOnly: number
  /** Raw spellings merged into this brand, most frequent first. */
  variants?: string[]
  avgRankPosition: number | null
  linkRate: number
  sentimentPositive: number
  sentimentNeutral: number
  sentimentNegative: number
}

export interface RankingResult {
  targetBrandRow: TargetBrandRow | null
  competitors: BrandRankRow[]
}

export interface KeywordBreakdownRow {
  keyword: string
  queriesExecuted: number
  visibilityPct: number
  avgRankPosition: number | null
  linkRatePct: number
  targetMentions: number
}

export interface PersonaBreakdownRow {
  personaId: string
  personaName: string
  queriesExecuted: number
  visibilityPct: number
  avgRankPosition: number | null
  linkRatePct: number
  targetMentions: number
}

export interface ReportFile {
  type: 'xlsx' | 'md'
  /** Legacy Drive link (not used in current n8n workflow) */
  driveUrl?: string
  /** For n8n-direct uploads: original file name */
  fileName?: string
  /** MD files: raw markdown text */
  content?: string
  /** XLSX files: base64-encoded binary */
  base64?: string
  createdAt?: string
}

export interface ReportResult {
  runId: string
  reportFolderId: string | null
  files: ReportFile[]
  uploadError: string | null
}

// ──────────────────────────────────────────────────────────────
// Profile types
// ──────────────────────────────────────────────────────────────

export interface LlmProfile {
  _id: string
  profileKey: string
  llmProvider: 'openai' | 'gemini' | 'perplexity'
  runModel: string
  qgenModel: string
  nerModel: string
  reportModel?: string
  batchSize?: number
  qgenBatchSize?: number
  responsesCfg?: Record<string, unknown>
  active: boolean
  createdAt: string
  updatedAt?: string
}

export interface CreateProfileDto {
  profileKey: string
  llmProvider: 'openai' | 'gemini' | 'perplexity'
  runModel: string
  qgenModel: string
  nerModel: string
  reportModel?: string
  batchSize?: number
  qgenBatchSize?: number
  responsesCfg?: Record<string, unknown>
}

export interface UpdateProfileDto {
  profileKey?: string
  llmProvider?: 'openai' | 'gemini' | 'perplexity'
  runModel?: string
  qgenModel?: string
  nerModel?: string
  reportModel?: string
  batchSize?: number
  qgenBatchSize?: number
  active?: boolean
  responsesCfg?: Record<string, unknown>
}

// ──────────────────────────────────────────────────────────────
// Admin types
// ──────────────────────────────────────────────────────────────

export interface UserProfile {
  _id: string
  userId: string
  email: string
  role: 'analyst' | 'admin'
  active: boolean
  createdAt: string
  updatedAt?: string
}

export interface CreateUserDto {
  username: string
  email: string
  password: string
  role: 'analyst' | 'admin'
}

export interface UpdateUserDto {
  role?: 'analyst' | 'admin'
  active?: boolean
}

export interface AdminRunRow {
  runId: string
  clientKey: string
  status: RunStatus
  profileKey: string
  createdAt: string
  completedAt?: string | null
}

// ──────────────────────────────────────────────────────────────
// Core fetch utility
// ──────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    let body: ApiErrorBody
    try {
      body = (await response.json()) as ApiErrorBody
    } catch {
      body = { error: { code: 'UNKNOWN', message: response.statusText } }
    }
    throw new ApiError(response.status, body)
  }

  // 204 No Content
  if (response.status === 204) return undefined as unknown as T

  return response.json() as Promise<T>
}

// ──────────────────────────────────────────────────────────────
// Domain endpoints (E-002, E-003, E-004, E-005)
// ──────────────────────────────────────────────────────────────

/** E-003 — List domains for current user. serves US-004 (AC-008) */
export async function getDomains(
  token: string,
  page = 1,
  limit = 20,
): Promise<ApiSuccess<Domain[]>> {
  return apiFetch<ApiSuccess<Domain[]>>(
    `/domains?page=${page}&limit=${limit}`,
    token,
  )
}

/** E-002 — Create domain. serves US-003 (AC-005, AC-006) */
export async function createDomain(
  token: string,
  dto: CreateDomainDto,
): Promise<ApiSuccess<Domain>> {
  return apiFetch<ApiSuccess<Domain>>('/domains', token, {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

/** E-004 — Get domain by clientKey. serves US-006 (AC-010) */
export async function getDomain(
  token: string,
  clientKey: string,
): Promise<ApiSuccess<Domain>> {
  return apiFetch<ApiSuccess<Domain>>(`/domains/${clientKey}`, token)
}

/** E-005 — Update domain. serves US-005 (AC-009) */
export async function updateDomain(
  token: string,
  clientKey: string,
  dto: UpdateDomainDto,
): Promise<ApiSuccess<Domain>> {
  return apiFetch<ApiSuccess<Domain>>(`/domains/${clientKey}`, token, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  })
}

/** E-006b — Delete domain. 204 on success; 409 if active runs exist. */
export async function deleteDomain(
  token: string,
  clientKey: string,
): Promise<void> {
  await apiFetch<void>(`/domains/${clientKey}`, token, { method: 'DELETE' })
}

export async function postDomainPersona(
  token: string,
  clientKey: string,
  persona: { name: string; description: string; context: string; searchStyle?: string },
): Promise<ApiSuccess<Domain>> {
  return apiFetch<ApiSuccess<Domain>>(`/domains/${clientKey}/personas`, token, {
    method: 'POST',
    body: JSON.stringify(persona),
  })
}

export async function patchDomainPersona(
  token: string,
  clientKey: string,
  personaId: string,
  update: { name?: string; description?: string; context?: string; searchStyle?: string },
): Promise<ApiSuccess<Domain>> {
  return apiFetch<ApiSuccess<Domain>>(`/domains/${clientKey}/personas/${encodeURIComponent(personaId)}`, token, {
    method: 'PATCH',
    body: JSON.stringify(update),
  })
}

export async function postDomainPersonasBulk(
  token: string,
  clientKey: string,
  personas: Array<{ name: string; description: string; context: string; searchStyle?: string }>,
): Promise<ApiSuccess<Domain>> {
  return apiFetch<ApiSuccess<Domain>>(`/domains/${clientKey}/personas/bulk`, token, {
    method: 'POST',
    body: JSON.stringify({ personas }),
  })
}

export async function deleteDomainPersona(
  token: string,
  clientKey: string,
  personaId: string,
): Promise<void> {
  await apiFetch<void>(`/domains/${clientKey}/personas/${encodeURIComponent(personaId)}`, token, {
    method: 'DELETE',
  })
}

// ── Brand unification ─────────────────────────────────────────

export interface BrandRegistryEntry {
  canonical: string
  variants: string[]
}

export interface BrandMergeSuggestion {
  canonical: string
  canonicalCount: number
  variants: { name: string; count: number }[]
}

export async function getBrandSuggestions(
  token: string,
  clientKey: string,
  runId: string,
): Promise<ApiSuccess<BrandMergeSuggestion[]>> {
  return apiFetch<ApiSuccess<BrandMergeSuggestion[]>>(
    `/domains/${clientKey}/runs/${encodeURIComponent(runId)}/results/brand-suggestions`,
    token,
  )
}

export async function confirmBrandMerge(
  token: string,
  clientKey: string,
  dto: { canonical: string; variants: string[] },
): Promise<ApiSuccess<Domain>> {
  return apiFetch<ApiSuccess<Domain>>(`/domains/${clientKey}/brand-registry`, token, {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export async function rejectBrandMerge(
  token: string,
  clientKey: string,
  a: string,
  b: string,
): Promise<ApiSuccess<Domain>> {
  return apiFetch<ApiSuccess<Domain>>(`/domains/${clientKey}/brand-registry/rejections`, token, {
    method: 'POST',
    body: JSON.stringify({ a, b }),
  })
}

export async function deleteBrandMerge(token: string, clientKey: string, canonical: string): Promise<void> {
  await apiFetch<void>(`/domains/${clientKey}/brand-registry/${encodeURIComponent(canonical)}`, token, {
    method: 'DELETE',
  })
}

export async function deleteBrandMergeVariant(
  token: string,
  clientKey: string,
  canonical: string,
  variant: string,
): Promise<void> {
  await apiFetch<void>(
    `/domains/${clientKey}/brand-registry/${encodeURIComponent(canonical)}/variants/${encodeURIComponent(variant)}`,
    token,
    { method: 'DELETE' },
  )
}

export async function postDomainPersonaGroup(
  token: string,
  clientKey: string,
  group: { name: string; personaIds: string[] },
): Promise<ApiSuccess<Domain>> {
  return apiFetch<ApiSuccess<Domain>>(`/domains/${clientKey}/persona-groups`, token, {
    method: 'POST',
    body: JSON.stringify(group),
  })
}

export async function deleteDomainPersonaGroup(
  token: string,
  clientKey: string,
  groupId: string,
): Promise<void> {
  await apiFetch<void>(`/domains/${clientKey}/persona-groups/${encodeURIComponent(groupId)}`, token, {
    method: 'DELETE',
  })
}

export async function patchDomainPersonaGroup(
  token: string,
  clientKey: string,
  groupId: string,
  update: { name?: string; personaIds?: string[] },
): Promise<ApiSuccess<Domain>> {
  return apiFetch<ApiSuccess<Domain>>(`/domains/${clientKey}/persona-groups/${encodeURIComponent(groupId)}`, token, {
    method: 'PATCH',
    body: JSON.stringify(update),
  })
}

// ──────────────────────────────────────────────────────────────
// Run endpoints (E-006, E-007, E-008, E-009)
// ──────────────────────────────────────────────────────────────

/** E-006 — Create and start run. serves US-007, US-008 (AC-011–015) */
export async function createRun(
  token: string,
  clientKey: string,
  dto: CreateRunDto,
): Promise<ApiSuccess<Run>> {
  return apiFetch<ApiSuccess<Run>>(`/domains/${clientKey}/runs`, token, {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

/** E-007 — List runs for a domain. serves US-006, US-011 (AC-010, AC-018) */
export async function getRuns(
  token: string,
  clientKey: string,
  params?: { page?: number; limit?: number; status?: RunStatus },
): Promise<ApiSuccess<RunListItem[]>> {
  const sp = new URLSearchParams()
  if (params?.page) sp.set('page', String(params.page))
  if (params?.limit) sp.set('limit', String(params.limit))
  if (params?.status) sp.set('status', params.status)
  const qs = sp.toString() ? `?${sp.toString()}` : ''
  return apiFetch<ApiSuccess<RunListItem[]>>(`/domains/${clientKey}/runs${qs}`, token)
}

/** E-008 — Get run detail. serves US-009, US-012 (AC-016, AC-017, AC-019) */
export async function getRun(
  token: string,
  clientKey: string,
  runId: string,
): Promise<ApiSuccess<Run>> {
  return apiFetch<ApiSuccess<Run>>(`/domains/${clientKey}/runs/${runId}`, token)
}

/** E-009 — Cancel run. serves US-010 (AC-042–045) */
export async function cancelRun(
  token: string,
  clientKey: string,
  runId: string,
): Promise<ApiSuccess<{ runId: string; status: string; completedAt: string }>> {
  return apiFetch(`/domains/${clientKey}/runs/${runId}`, token, {
    method: 'DELETE',
  })
}

/** Permanently deletes a finished run and all its data (queries, responses, items). */
export async function deleteRunPermanently(
  token: string,
  clientKey: string,
  runId: string,
): Promise<ApiSuccess<{ runId: string; deleted: boolean; queries: number; responses: number; items: number }>> {
  return apiFetch(`/domains/${clientKey}/runs/${runId}/permanent`, token, { method: 'DELETE' })
}

// ──────────────────────────────────────────────────────────────
// Results endpoints (E-010, E-011, E-012, E-013, E-014)
// ──────────────────────────────────────────────────────────────

/** E-010 — Get run KPIs. serves US-013 (AC-020, AC-021) */
export async function getRunKpis(
  token: string,
  clientKey: string,
  runId: string,
): Promise<ApiSuccess<RunKpis>> {
  return apiFetch<ApiSuccess<RunKpis>>(
    `/domains/${clientKey}/runs/${runId}/results/kpis`,
    token,
  )
}

/** E-011 — Get competitor ranking. serves US-014 (AC-022, AC-023) */
export async function getRunRanking(
  token: string,
  clientKey: string,
  runId: string,
  page = 1,
  limit = 50,
): Promise<ApiSuccess<RankingResult>> {
  return apiFetch<ApiSuccess<RankingResult>>(
    `/domains/${clientKey}/runs/${runId}/results/ranking?page=${page}&limit=${limit}`,
    token,
  )
}

/** E-012 — Get keyword breakdown. serves US-015 (AC-024) */
export async function getRunKeywords(
  token: string,
  clientKey: string,
  runId: string,
): Promise<ApiSuccess<KeywordBreakdownRow[]>> {
  return apiFetch<ApiSuccess<KeywordBreakdownRow[]>>(
    `/domains/${clientKey}/runs/${runId}/results/by-keyword`,
    token,
  )
}

/** E-013 — Get persona breakdown. serves US-016 (AC-025) */
export async function getRunPersonas(
  token: string,
  clientKey: string,
  runId: string,
): Promise<ApiSuccess<PersonaBreakdownRow[]>> {
  return apiFetch<ApiSuccess<PersonaBreakdownRow[]>>(
    `/domains/${clientKey}/runs/${runId}/results/by-persona`,
    token,
  )
}

/** Add a persona to a run */
export async function postRunPersona(
  token: string,
  clientKey: string,
  runId: string,
  persona: { id?: string; name: string; description: string; context: string; searchStyle?: string },
): Promise<ApiSuccess<unknown>> {
  return apiFetch<ApiSuccess<unknown>>(
    `/domains/${clientKey}/runs/${runId}/personas`,
    token,
    { method: 'POST', body: JSON.stringify(persona) },
  )
}

/** Remove a persona from a run */
export async function deleteRunPersona(
  token: string,
  clientKey: string,
  runId: string,
  personaId: string,
): Promise<void> {
  await apiFetch<void>(
    `/domains/${clientKey}/runs/${runId}/personas/${encodeURIComponent(personaId)}`,
    token,
    { method: 'DELETE' },
  )
}

/** E-014 — Get report file links. serves US-017 (AC-026, AC-027) */
export async function getRunReport(
  token: string,
  clientKey: string,
  runId: string,
): Promise<ApiSuccess<ReportResult>> {
  return apiFetch<ApiSuccess<ReportResult>>(
    `/domains/${clientKey}/runs/${runId}/results/report`,
    token,
  )
}

/** Download a generated report file (md or xlsx) as a Blob. */
export async function getRunReportBlob(
  token: string,
  clientKey: string,
  runId: string,
  type: 'md' | 'xlsx',
): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/domains/${clientKey}/runs/${runId}/report/${type}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({
      error: { code: 'DOWNLOAD_FAILED', message: 'Download failed' },
    }))) as ApiErrorBody
    throw new ApiError(res.status, body)
  }
  return res.blob()
}

// ──────────────────────────────────────────────────────────────
// Profile endpoints (E-015, E-016, E-017)
// ──────────────────────────────────────────────────────────────

/** E-015 — List LLM profiles. serves US-007, US-025 (AC-012, AC-039) */
export async function getProfiles(
  token: string,
  page = 1,
  limit = 50,
): Promise<ApiSuccess<LlmProfile[]>> {
  return apiFetch<ApiSuccess<LlmProfile[]>>(`/profiles?page=${page}&limit=${limit}`, token)
}

/** GET /personas — Static persona catalog for run configuration */
export async function getPersonas(token: string): Promise<ApiSuccess<Persona[]>> {
  return apiFetch<ApiSuccess<Persona[]>>('/personas', token)
}

// ──────────────────────────────────────────────────────────────
// Admin endpoints (E-019, E-020, E-021, E-022)
// ──────────────────────────────────────────────────────────────

/** E-019 — Admin: list all runs. serves US-024 (AC-038) */
export async function getAdminRuns(
  token: string,
  params?: { page?: number; limit?: number; status?: RunStatus; clientKey?: string },
): Promise<ApiSuccess<AdminRunRow[]>> {
  const sp = new URLSearchParams()
  if (params?.page) sp.set('page', String(params.page))
  if (params?.limit) sp.set('limit', String(params.limit))
  if (params?.status) sp.set('status', params.status)
  if (params?.clientKey) sp.set('clientKey', params.clientKey)
  const qs = sp.toString() ? `?${sp.toString()}` : ''
  return apiFetch<ApiSuccess<AdminRunRow[]>>(`/admin/runs${qs}`, token)
}

/** E-020 — Admin: list user profiles. serves US-023 (AC-037) */
export async function getAdminUsers(
  token: string,
  page = 1,
  limit = 50,
): Promise<ApiSuccess<UserProfile[]>> {
  return apiFetch<ApiSuccess<UserProfile[]>>(
    `/admin/users?page=${page}&limit=${limit}`,
    token,
  )
}

/** E-021 — Admin: create user profile. serves US-023 (AC-037) */
export async function createAdminUser(
  token: string,
  dto: CreateUserDto,
): Promise<ApiSuccess<UserProfile>> {
  return apiFetch<ApiSuccess<UserProfile>>('/admin/users', token, {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

/** E-022 — Admin: update user profile. serves US-023 (AC-037) */
export async function updateAdminUser(
  token: string,
  userId: string,
  dto: UpdateUserDto,
): Promise<ApiSuccess<UserProfile>> {
  return apiFetch<ApiSuccess<UserProfile>>(`/admin/users/${userId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  })
}

/** E-023 — Admin: delete user. 204 on success. */
export async function deleteAdminUser(
  token: string,
  userId: string,
): Promise<void> {
  await apiFetch<void>(`/admin/users/${userId}`, token, { method: 'DELETE' })
}

// ──────────────────────────────────────────────────────────────
// Worker pool (admin)
// ──────────────────────────────────────────────────────────────

export interface Worker {
  workerId: string
  label: string
  webhookUrl: string
  active: boolean
}

export interface WorkerWithOccupancy extends Worker {
  healthy: boolean | null
  lastHealthCheckAt: string | null
  lastHealthCheckError: string | null
  inUse: { runId: string; clientKey: string } | null
}

export interface CreateWorkerDto {
  label: string
  webhookUrl: string
}

export interface UpdateWorkerDto {
  label?: string
  webhookUrl?: string
  active?: boolean
}

export async function getWorkers(token: string): Promise<ApiSuccess<WorkerWithOccupancy[]>> {
  return apiFetch<ApiSuccess<WorkerWithOccupancy[]>>('/admin/workers', token)
}

export async function createWorker(
  token: string,
  dto: CreateWorkerDto,
): Promise<ApiSuccess<Worker>> {
  return apiFetch<ApiSuccess<Worker>>('/admin/workers', token, {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export async function updateWorker(
  token: string,
  workerId: string,
  dto: UpdateWorkerDto,
): Promise<ApiSuccess<Worker>> {
  return apiFetch<ApiSuccess<Worker>>(`/admin/workers/${workerId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  })
}

export async function deleteWorker(token: string, workerId: string): Promise<void> {
  await apiFetch<void>(`/admin/workers/${workerId}`, token, { method: 'DELETE' })
}

export async function checkWorkerHealth(token: string, workerId: string): Promise<ApiSuccess<WorkerWithOccupancy>> {
  return apiFetch<ApiSuccess<WorkerWithOccupancy>>(`/admin/workers/${workerId}/health-check`, token, {
    method: 'POST',
  })
}

// ──────────────────────────────────────────────────────────────
// Campaign types (aggregated multi-section run)
// ──────────────────────────────────────────────────────────────

export type CampaignStatus = 'queued' | 'running' | 'aggregating' | 'done' | 'partial' | 'error'
export type SectionStatus = 'queued' | 'running' | 'done' | 'error' | 'missing' | 'cancelled'

export interface CampaignSection {
  sectionKey: string
  label: string
  runId: string
  status: SectionStatus
  queuePosition?: number
  queueLength?: number
}

export interface CampaignCoverage {
  sectionsTotal: number
  sectionsDone: number
  sectionsMissing: string[]
  plannedQueries: number
  doneQueries: number
  errorQueries: number
}

export interface Campaign {
  campaignId: string
  clientKey: string
  profileKey: string
  targetDomain?: string
  brand?: string
  status: CampaignStatus
  sections: CampaignSection[]
  concurrency: number
  coverage: CampaignCoverage | null
  errorMessage?: string | null
  startedAt?: string
  completedAt?: string | null
  createdAt: string
}

export interface CampaignSectionDto {
  /** Analysis name, shown in the wizard sidebar/recap and used to derive sectionKey. */
  label: string
  profileKey: string
  runIterations: number
  targetUrl?: string
  locales?: string[]
  keywordsByLang?: Record<string, string[]>
  questionsCountByLang?: Record<string, number>
  activePersonaIds?: string[]
  locationFocusByLang?: Record<string, string>
  topics?: Array<{ id: string; label: string; keywords?: string[] }>
  testMode?: boolean
  debugMode?: boolean
}

export interface CreateCampaignDto {
  sections: CampaignSectionDto[]
}

export interface CampaignListItem {
  campaignId: string
  clientKey: string
  profileKey: string
  status: CampaignStatus
  sections: CampaignSection[]
  createdAt: string
  completedAt?: string | null
}

export interface CampaignBrandStat {
  brand: string
  isTarget: boolean
  mentions: number
  weight: number
  aiVisibilityScore: number
  avgRankPosition: number | null
  linkRate: number
  sentimentPositive: number
  sentimentNeutral: number
  sentimentNegative: number
}

export interface CampaignRanking {
  totalMentions: number
  shareOfVoice: number
  target: CampaignBrandStat | null
  top: CampaignBrandStat[]
}

export interface CampaignMatrix {
  columns: string[]
  rows: Array<{ personaId: string; values: number[]; total: number }>
}

export interface CampaignAggregate {
  campaignId: string
  status: CampaignStatus
  coverage: CampaignCoverage | null
  aggregate: {
    perSection: Record<string, { ranking: CampaignRanking; insights: string[] }>
    overall: { ranking: CampaignRanking; insights: string[] }
    matrix: CampaignMatrix
  } | null
}

// ──────────────────────────────────────────────────────────────
// Campaign endpoints
// ──────────────────────────────────────────────────────────────

export async function createCampaign(
  token: string,
  clientKey: string,
  dto: CreateCampaignDto,
): Promise<ApiSuccess<Campaign>> {
  return apiFetch<ApiSuccess<Campaign>>(`/domains/${clientKey}/campaigns`, token, {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export async function getCampaigns(
  token: string,
  clientKey: string,
  params?: { page?: number; limit?: number; status?: CampaignStatus },
): Promise<ApiSuccess<CampaignListItem[]>> {
  const sp = new URLSearchParams()
  if (params?.page) sp.set('page', String(params.page))
  if (params?.limit) sp.set('limit', String(params.limit))
  if (params?.status) sp.set('status', params.status)
  const qs = sp.toString() ? `?${sp.toString()}` : ''
  return apiFetch<ApiSuccess<CampaignListItem[]>>(`/domains/${clientKey}/campaigns${qs}`, token)
}

export async function getCampaign(
  token: string,
  clientKey: string,
  campaignId: string,
): Promise<ApiSuccess<Campaign>> {
  return apiFetch<ApiSuccess<Campaign>>(`/domains/${clientKey}/campaigns/${campaignId}`, token)
}

export async function getCampaignAggregate(
  token: string,
  clientKey: string,
  campaignId: string,
): Promise<ApiSuccess<CampaignAggregate>> {
  return apiFetch<ApiSuccess<CampaignAggregate>>(
    `/domains/${clientKey}/campaigns/${campaignId}/aggregate`,
    token,
  )
}

export async function rerunCampaignSection(
  token: string,
  clientKey: string,
  campaignId: string,
  sectionKey: string,
): Promise<ApiSuccess<Campaign>> {
  return apiFetch<ApiSuccess<Campaign>>(
    `/domains/${clientKey}/campaigns/${campaignId}/sections/${encodeURIComponent(sectionKey)}/rerun`,
    token,
    { method: 'POST' },
  )
}

export async function cancelCampaign(
  token: string,
  clientKey: string,
  campaignId: string,
): Promise<ApiSuccess<Campaign>> {
  return apiFetch<ApiSuccess<Campaign>>(`/domains/${clientKey}/campaigns/${campaignId}/cancel`, token, {
    method: 'POST',
  })
}
