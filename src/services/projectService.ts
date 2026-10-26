import api from '../lib/axios';
import type {
  ListingType,
  OffPlanDevelopmentStatus,
  ProjectCard,
  ProjectDetail,
  ProjectImportListItem,
  ProjectImportSchema,
  ProjectImportSession,
  ProjectMedia,
  ProjectStatus,
  ProjectType,
  ProjectUnit,
  Property,
} from '../types';
import { normalizeProjectPublication } from '../utils/projectPublication';

const compact = <T extends object>(value?: T) =>
  Object.fromEntries(
    Object.entries(value ?? {}).filter(([, item]) => item !== '' && item !== undefined && item !== null),
  );

const normalizeProjectListResponse = (data: ProjectListResponse): ProjectListResponse => ({
  ...data,
  projects: (data.projects ?? []).map((project) => normalizeProjectPublication(project)),
});

export interface ProjectSearchQuery {
  search?: string;
  projectType?: ProjectType | string;
  state?: string;
  city?: string;
  area?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: ProjectStatus | string;
  featured?: boolean;
  ownerId?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  availableOnly?: boolean;
  listingType?: ListingType;
  developmentStatus?: OffPlanDevelopmentStatus | string;
  installmentAvailable?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  publicationState?: 'published' | 'unpublished' | 'all' | string;
}

export interface ProjectPropertyQuery {
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string;
  status?: string;
  availableOnly?: boolean;
  phase?: string;
  block?: string;
  floor?: string;
  listingType?: ListingType;
  developmentStatus?: OffPlanDevelopmentStatus | string;
  installmentAvailable?: boolean;
  completionBefore?: string;
  completionAfter?: string;
  page?: number;
  limit?: number;
  sort?: string;
  includeUnpublished?: boolean;
}

export interface ProjectMapQuery extends ProjectSearchQuery {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

const canonicalProjectParams = (query?: ProjectSearchQuery | URLSearchParams) => {
  const params = query instanceof URLSearchParams
    ? new URLSearchParams(query)
    : new URLSearchParams(Object.entries(compact(query)).map(([key, value]) => [key, String(value)]));
  params.set('queryVersion', 'canonical-v1');
  return params;
};

export interface ProjectMapItem {
  _id: string;
  name: string;
  slug: string;
  projectType: ProjectType | string;
  minimumPrice?: number;
  maximumPrice?: number;
  currency?: string;
  availableUnits?: number;
  coordinates?: { lat: number; lng: number } | null;
}

export interface ProjectListResponse {
  projects: ProjectCard[];
  total: number;
  page: number;
  limit: number;
  facets?: Record<string, unknown>;
  normalization?: { queryVersion?: string; query?: unknown; notices?: unknown[] };
}

export interface ProjectPropertiesResponse {
  project: ProjectCard;
  properties: Property[];
  total: number;
  page: number;
  limit: number;
  facets?: Record<string, unknown>;
  normalization?: { queryVersion?: string; query?: unknown; notices?: unknown[] };
}

export interface ProjectMapResponse {
  mode: 'projects';
  bounds: { north: number; south: number; east: number; west: number; zoom: number };
  total: number;
  projects: ProjectMapItem[];
  facets?: Record<string, unknown>;
  normalization?: { queryVersion?: string; query?: unknown; notices?: unknown[] };
}

const parseProjectMapResponse = (value: unknown): ProjectMapResponse => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Project map response is not available in a supported format. Use list view to continue.');
  }
  const response = value as Partial<ProjectMapResponse>;
  if (!Array.isArray(response.projects) || typeof response.total !== 'number' || !Number.isFinite(response.total)) {
    throw new Error('Project map marker fields are not fully specified for this response. Use list view to continue.');
  }
  return value as ProjectMapResponse;
};

export interface UnitGridQuery {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'availability' | 'publication' | 'unit_type';
  search?: string;
  unitTypeId?: string;
  availability?: 'available' | 'under_offer' | 'sold' | 'not_released';
  publicationState?: 'published' | 'unpublished' | 'blocked' | 'needs_review' | 'archived';
  problemsOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
  currency?: 'NGN' | 'USD';
  propertyType?: string;
}

export interface CreateProjectRequest {
  canonicalFields?: Record<string, unknown>;
  canonicalFieldMutations?: Array<{ field: string; operation: 'set' | 'set_null' | 'unset' | 'reset_to_inherit'; value?: unknown }>;
  name: string;
  developerName?: string;
  projectType: ProjectType | string;
  description: string;
  shortDescription?: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  area?: string;
  coordinates?: { lat: number; lng: number } | null;
  amenities?: string[];
  features?: string[];
  nearbyLandmarks?: Array<{ name: string; distance?: string; type?: string }>;
  media?: ProjectMedia[];
  completionDate?: string;
  launchDate?: string;
  status?: ProjectStatus;
}

export type UpdateProjectRequest = Omit<Partial<CreateProjectRequest>, 'canonicalFields'> & { expectedVersion?: number };
export type MyProjectQuery = Pick<ProjectSearchQuery, 'search' | 'status' | 'publicationState' | 'page' | 'limit' | 'sort'>;

export interface ProjectImportListResponse {
  imports: ProjectImportListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminPropertyImportListQuery {
  project?: string;
  landlord?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface UnitGridRow {
  _id: string;
  publicReference?: string;
  rawOverrides: Record<string, unknown>;
  effectiveFields: Record<string, unknown>;
  fieldSources: Record<string, { sourceLevel: 'unit' | 'unitType' | 'project' | string; state: string }>;
  version: number;
  readiness: { publicationState: string; problems: boolean; blockers?: Array<{ field?: string; code?: string }>; migrationState?: string };
}

export interface UnitGridResponse {
  project: { id: string; name: string };
  projectVersion: number;
  items: UnitGridRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
  filters: Record<string, unknown>;
}

export interface UnitGridMutation {
  field: string;
  operation: 'set' | 'unset' | 'reset_to_inherited';
  value?: unknown;
}

export interface UnitGridEditRequest {
  operationKey: string;
  expectedProjectVersion: number;
  rows: Array<{ unitId: string; expectedVersion: number; canonicalFieldMutations: UnitGridMutation[] } | { unitId: string; expectedVersion: number; unitTypeId: string }>;
}

export interface UnitGridOperation {
  id: string;
  state: string;
  action: string;
  undoAvailable: boolean;
  undoExpiresAt?: string | null;
  rowCount: number;
  createdAt: string;
  undoneAt?: string | null;
  rows: Array<{ propertyId: string; beforeVersion: number; afterVersion: number; fields?: string[] }>;
}

export interface UnitGridJob {
  id: string;
  projectId: string;
  action: string;
  state: 'queued' | 'processing' | 'completed' | 'partially_completed' | 'failed' | 'cancelled';
  operationKey: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  progress: { total: number; completed: number; failed: number; cancelled: number; remaining: number };
  cancellationRequested: boolean;
  rows: Array<{ index: number; unitId: string; state: string; attempts: number; undoAvailable: boolean; operationId?: string; operationCreatedAt?: string; beforeVersion?: number; afterVersion?: number; error?: { code: string; message: string } }>;
}

export interface UnitGridJobRequest {
  operationKey: string;
  expectedProjectVersion: number;
  action: 'field_edit' | 'availability' | 'price_adjustment' | 'publish' | 'unpublish' | 'archive' | 'confirm';
  actionOptions?: Record<string, unknown>;
  rows: Array<{ unitId: string; expectedVersion: number; canonicalFieldMutations?: UnitGridMutation[] }>;
}

export interface UnitTypeDto {
  id: string;
  version: number;
  projectVersion: number;
  canonicalFields: Record<string, unknown>;
  effectiveFields: Record<string, unknown>;
  fieldSources: Record<string, { sourceLevel: string; state: string }>;
  media?: ProjectMedia[];
}

export interface UnitTypeListResponse {
  projectVersion: number;
  unitTypes: UnitTypeDto[];
}

export type ProjectPublicationRequest =
  | { expectedVersion: number; publicationAction: 'publish_all_ready' }
  | { expectedVersion: number; publicationAction: 'publish_selected'; selectedUnitIds: string[] }
  | { expectedVersion: number; publicationAction: 'save_draft' };

export const projectService = {
  async listProjects(query?: ProjectSearchQuery | URLSearchParams, signal?: AbortSignal): Promise<ProjectListResponse> {
    const { data } = await api.get<ProjectListResponse>('/projects', { params: canonicalProjectParams(query), signal });
    return data;
  },

  async getProject(idOrSlug: string): Promise<{ project: ProjectDetail }> {
    const { data } = await api.get<{ project: ProjectDetail }>(`/projects/${encodeURIComponent(idOrSlug)}`);
    return data;
  },

  async getProjectProperties(idOrSlug: string, query?: ProjectPropertyQuery | URLSearchParams, signal?: AbortSignal): Promise<ProjectPropertiesResponse> {
    const { data } = await api.get<ProjectPropertiesResponse>(`/projects/${encodeURIComponent(idOrSlug)}/properties`, {
      params: query instanceof URLSearchParams ? canonicalProjectParams(query) : compact(query),
      signal,
    });
    return data;
  },

  async getProjectMap(query: ProjectMapQuery | URLSearchParams, signal?: AbortSignal): Promise<ProjectMapResponse> {
    const params = canonicalProjectParams(query);
    // Project map results summarize all matching projects in the bounds; page
    // state belongs to the list view and must not limit the map request.
    params.delete('page');
    params.delete('limit');
    const { data } = await api.get<unknown>('/projects/map', { params, signal });
    return parseProjectMapResponse(data);
  },

  async createProject(body: CreateProjectRequest, challengeId?: string): Promise<{ project: ProjectDetail }> {
    const { data } = challengeId
      ? await api.post<{ project: ProjectDetail }>('/projects', body, { headers: { 'X-Step-Up-Challenge': challengeId } })
      : await api.post<{ project: ProjectDetail }>('/projects', body);
    return data;
  },

  async listMyProjects(query?: MyProjectQuery): Promise<ProjectListResponse> {
    const { data } = await api.get<ProjectListResponse>('/projects/mine', { params: compact(query) });
    return normalizeProjectListResponse(data);
  },

  async getProjectManage(id: string): Promise<{ project: ProjectDetail }> {
    const { data } = await api.get<{ project: ProjectDetail }>(`/projects/${encodeURIComponent(id)}/manage`);
    return { ...data, project: normalizeProjectPublication(data.project) };
  },

  async listUnitTypes(projectId: string): Promise<UnitTypeListResponse> {
    const { data } = await api.get<UnitTypeListResponse>(`/projects/${encodeURIComponent(projectId)}/unit-types`);
    return data;
  },

  async createUnitType(projectId: string, body: { expectedVersion: number; canonicalFields?: Record<string, unknown> }, challengeId?: string): Promise<{ unitType: UnitTypeDto; projectVersion: number }> {
    const config = challengeId ? { headers: { 'X-Step-Up-Challenge': challengeId } } : undefined;
    const { data } = await api.post<{ unitType: UnitTypeDto; projectVersion: number }>(`/projects/${encodeURIComponent(projectId)}/unit-types`, body, config);
    return data;
  },

  async updateUnitType(projectId: string, unitTypeId: string, body: { expectedVersion: number; expectedTypeVersion: number; canonicalFieldMutations: Array<{ field: string; operation: string; value?: unknown }> }, challengeId?: string): Promise<{ unitType: UnitTypeDto; impact: unknown; projectVersion: number }> {
    const config = challengeId ? { headers: { 'X-Step-Up-Challenge': challengeId } } : undefined;
    const { data } = await api.patch<{ unitType: UnitTypeDto; impact: unknown; projectVersion: number }>(`/projects/${encodeURIComponent(projectId)}/unit-types/${encodeURIComponent(unitTypeId)}`, body, config);
    return data;
  },

  async unitTypeImpact(projectId: string, unitTypeId: string): Promise<{ unitType: UnitTypeDto; impact: { affectedUnits: number; fields: Record<string, { inheritingUnits: number; overriddenUnits: number }> } }> {
    const { data } = await api.get(`/projects/${encodeURIComponent(projectId)}/unit-types/${encodeURIComponent(unitTypeId)}/impact`);
    return data;
  },

  async deleteUnitType(projectId: string, unitTypeId: string, body: { expectedVersion: number; expectedTypeVersion: number }, challengeId: string): Promise<{ removed: true; projectVersion: number }> {
    const { data } = await api.delete<{ removed: true; projectVersion: number }>(`/projects/${encodeURIComponent(projectId)}/unit-types/${encodeURIComponent(unitTypeId)}`, { data: body, headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },

  async deleteProject(id: string, body: { expectedVersion?: number }, challengeId: string): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(`/projects/${encodeURIComponent(id)}`, { data: body, headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },

  async downloadUnitGridCsv(projectId: string): Promise<Blob> {
    const { data } = await api.get<Blob>(`/projects/${encodeURIComponent(projectId)}/unit-grid/export.csv`, { responseType: 'blob' });
    return data;
  },

  async getUnitGrid(projectId: string, query?: UnitGridQuery): Promise<UnitGridResponse> {
    const { data } = await api.get<UnitGridResponse>(`/projects/${encodeURIComponent(projectId)}/unit-grid`, { params: compact(query) });
    return data;
  },

  async editUnitGrid(projectId: string, body: UnitGridEditRequest): Promise<{ operation: UnitGridOperation; projectVersion: number; replayed: boolean }> {
    const { data } = await api.post<{ operation: UnitGridOperation; projectVersion: number; replayed: boolean }>(`/projects/${encodeURIComponent(projectId)}/unit-grid/bulk`, body);
    return data;
  },

  async createUnitGridJob(projectId: string, body: UnitGridJobRequest): Promise<UnitGridJob> {
    const { data } = await api.post<{ job: UnitGridJob }>(`/projects/${encodeURIComponent(projectId)}/unit-grid/jobs`, body);
    return data.job;
  },

  async getUnitGridJob(projectId: string, jobId: string): Promise<UnitGridJob> {
    const { data } = await api.get<{ job: UnitGridJob }>(`/projects/${encodeURIComponent(projectId)}/unit-grid/jobs/${encodeURIComponent(jobId)}`);
    return data.job;
  },

  async cancelUnitGridJob(projectId: string, jobId: string): Promise<UnitGridJob> {
    const { data } = await api.post<{ job: UnitGridJob }>(`/projects/${encodeURIComponent(projectId)}/unit-grid/jobs/${encodeURIComponent(jobId)}/cancel`);
    return data.job;
  },

  async updateProject(id: string, body: UpdateProjectRequest, challengeId?: string): Promise<{ project: ProjectDetail }> {
    const { data } = challengeId
      ? await api.patch<{ project: ProjectDetail }>(`/projects/${encodeURIComponent(id)}`, body, { headers: { 'X-Step-Up-Challenge': challengeId } })
      : await api.patch<{ project: ProjectDetail }>(`/projects/${encodeURIComponent(id)}`, body);
    return data;
  },

  async publishProject(id: string, body: ProjectPublicationRequest, challengeId: string): Promise<{ project: ProjectDetail }> {
    const { data } = await api.patch<{ project: ProjectDetail }>(`/projects/${encodeURIComponent(id)}`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return { ...data, project: normalizeProjectPublication(data.project) };
  },

  async addProjectMedia(id: string, body: ProjectMedia | { media: ProjectMedia[] }): Promise<{ project: ProjectDetail }> {
    const { data } = await api.post<{ project: ProjectDetail }>(`/projects/${encodeURIComponent(id)}/media`, body);
    return data;
  },

  async attachPropertyToProject(propertyId: string, body: { projectId: string; projectUnit?: ProjectUnit }): Promise<{ property: Property }> {
    const { data } = await api.patch<{ property: Property }>(`/properties/${encodeURIComponent(propertyId)}/project`, body);
    return data;
  },

  async detachPropertyFromProject(propertyId: string): Promise<{ property: Property }> {
    const { data } = await api.delete<{ property: Property }>(`/properties/${encodeURIComponent(propertyId)}/project`);
    return data;
  },

  async adminListProjects(query?: ProjectSearchQuery): Promise<ProjectListResponse> {
    const { data } = await api.get<ProjectListResponse>('/admin/projects', { params: compact(query) });
    return normalizeProjectListResponse(data);
  },

  async adminGetProject(id: string): Promise<{ project: ProjectDetail }> {
    const { data } = await api.get<{ project: ProjectDetail }>(`/admin/projects/${encodeURIComponent(id)}`);
    return { ...data, project: normalizeProjectPublication(data.project) };
  },

  async adminUpdateProjectStatus(id: string, body: { status: ProjectStatus }, challengeId: string): Promise<{ project: ProjectDetail }> {
    const { data } = await api.patch<{ project: ProjectDetail }>(`/admin/projects/${encodeURIComponent(id)}/status`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },

  async adminSetProjectFeatured(id: string, body: { featured: boolean }, challengeId: string): Promise<{ project: ProjectDetail }> {
    const { data } = await api.patch<{ project: ProjectDetail }>(`/admin/projects/${encodeURIComponent(id)}/featured`, body, { headers: { 'X-Step-Up-Challenge': challengeId } });
    return data;
  },

  async uploadProjectPropertyImport(projectId: string, file: File): Promise<ProjectImportSession> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<ProjectImportSession>(`/projects/${encodeURIComponent(projectId)}/property-imports`, formData);
    return data;
  },

  async listProjectPropertyImports(projectId: string, params?: { page?: number; limit?: number }): Promise<ProjectImportListResponse> {
    const { data } = await api.get<ProjectImportListResponse>(`/projects/${encodeURIComponent(projectId)}/property-imports`, { params: compact(params) });
    return data;
  },

  async downloadProjectPropertyImportTemplate(projectId: string): Promise<Blob> {
    const { data } = await api.get<Blob>(`/projects/${encodeURIComponent(projectId)}/property-imports/template`, { responseType: 'blob' });
    return data;
  },

  async getProjectPropertyImportSchema(projectId: string): Promise<ProjectImportSchema> {
    const { data } = await api.get<ProjectImportSchema>(`/projects/${encodeURIComponent(projectId)}/property-imports/schema`);
    return data;
  },

  async getProjectPropertyImport(projectId: string, importId: string, params?: { page?: number; limit?: number }): Promise<ProjectImportSession> {
    const { data } = await api.get<ProjectImportSession>(`/projects/${encodeURIComponent(projectId)}/property-imports/${encodeURIComponent(importId)}`, { params: compact(params) });
    return data;
  },

  async editProjectPropertyImportRow(projectId: string, importId: string, rowNumber: number, data: Record<string, unknown>): Promise<ProjectImportSession> {
    const { data: response } = await api.patch<ProjectImportSession>(`/projects/${encodeURIComponent(projectId)}/property-imports/${encodeURIComponent(importId)}/rows/${rowNumber}`, data);
    return response;
  },

  async removeProjectPropertyImportRow(projectId: string, importId: string, rowNumber: number): Promise<ProjectImportSession> {
    const { data } = await api.delete<ProjectImportSession>(`/projects/${encodeURIComponent(projectId)}/property-imports/${encodeURIComponent(importId)}/rows/${rowNumber}`);
    return data;
  },

  async restoreProjectPropertyImportRow(projectId: string, importId: string, rowNumber: number): Promise<ProjectImportSession> {
    const { data } = await api.post<ProjectImportSession>(`/projects/${encodeURIComponent(projectId)}/property-imports/${encodeURIComponent(importId)}/rows/${rowNumber}/restore`);
    return data;
  },

  async confirmProjectPropertyImport(projectId: string, importId: string): Promise<ProjectImportSession> {
    const { data } = await api.post<ProjectImportSession>(`/projects/${encodeURIComponent(projectId)}/property-imports/${encodeURIComponent(importId)}/confirm`);
    return data;
  },

  async retryFailedProjectPropertyImportRows(projectId: string, importId: string): Promise<ProjectImportSession> {
    const { data } = await api.post<ProjectImportSession>(`/projects/${encodeURIComponent(projectId)}/property-imports/${encodeURIComponent(importId)}/retry-failed`);
    return data;
  },

  async cancelProjectPropertyImport(projectId: string, importId: string): Promise<ProjectImportSession> {
    const { data } = await api.patch<ProjectImportSession>(`/projects/${encodeURIComponent(projectId)}/property-imports/${encodeURIComponent(importId)}/cancel`);
    return data;
  },

  async listAdminPropertyImports(params?: AdminPropertyImportListQuery): Promise<ProjectImportListResponse> {
    const { data } = await api.get<ProjectImportListResponse>('/admin/property-imports', { params: compact(params) });
    return data;
  },

  async getAdminPropertyImport(importId: string): Promise<ProjectImportSession> {
    const { data } = await api.get<ProjectImportSession>(`/admin/property-imports/${encodeURIComponent(importId)}`);
    return data;
  },
};
