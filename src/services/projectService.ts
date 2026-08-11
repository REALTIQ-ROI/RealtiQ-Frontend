import api from '../lib/axios';
import type {
  ListingType,
  OffPlanDevelopmentStatus,
  ProjectCard,
  ProjectDetail,
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

export interface ProjectMapItem {
  _id: string;
  name: string;
  slug: string;
  projectType: ProjectType | string;
  minimumPrice?: number;
  maximumPrice?: number;
  availableUnits?: number;
  coordinates?: { lat: number; lng: number } | null;
}

export interface ProjectListResponse {
  projects: ProjectCard[];
  total: number;
  page: number;
  limit: number;
}

export interface ProjectPropertiesResponse {
  project: ProjectCard;
  properties: Property[];
  total: number;
  page: number;
  limit: number;
}

export interface ProjectMapResponse {
  mode: 'projects';
  bounds: { north: number; south: number; east: number; west: number; zoom: number };
  total: number;
  projects: ProjectMapItem[];
}

export interface CreateProjectRequest {
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
  publish?: boolean;
}

export type UpdateProjectRequest = Partial<CreateProjectRequest> & { publish?: boolean; isPublished?: boolean };
export type MyProjectQuery = Pick<ProjectSearchQuery, 'search' | 'status' | 'publicationState' | 'page' | 'limit' | 'sort'>;

export const projectService = {
  async listProjects(query?: ProjectSearchQuery): Promise<ProjectListResponse> {
    const { data } = await api.get<ProjectListResponse>('/projects', { params: compact(query) });
    return data;
  },

  async getProject(idOrSlug: string): Promise<{ project: ProjectDetail }> {
    const { data } = await api.get<{ project: ProjectDetail }>(`/projects/${encodeURIComponent(idOrSlug)}`);
    return data;
  },

  async getProjectProperties(idOrSlug: string, query?: ProjectPropertyQuery): Promise<ProjectPropertiesResponse> {
    const { data } = await api.get<ProjectPropertiesResponse>(`/projects/${encodeURIComponent(idOrSlug)}/properties`, {
      params: compact(query),
    });
    return data;
  },

  async getProjectMap(query: ProjectMapQuery): Promise<ProjectMapResponse> {
    const { data } = await api.get<ProjectMapResponse>('/projects/map', { params: compact(query) });
    return data;
  },

  async createProject(body: CreateProjectRequest): Promise<{ project: ProjectDetail }> {
    const { data } = await api.post<{ project: ProjectDetail }>('/projects', body);
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

  async updateProject(id: string, body: UpdateProjectRequest): Promise<{ project: ProjectDetail }> {
    const { data } = await api.patch<{ project: ProjectDetail }>(`/projects/${encodeURIComponent(id)}`, body);
    return data;
  },

  async deleteProject(id: string): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(`/projects/${encodeURIComponent(id)}`);
    return data;
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

  async adminUpdateProjectStatus(id: string, body: { status?: ProjectStatus; isPublished?: boolean }): Promise<{ project: ProjectDetail }> {
    const { data } = await api.patch<{ project: ProjectDetail }>(`/admin/projects/${encodeURIComponent(id)}/status`, body);
    return data;
  },

  async adminSetProjectFeatured(id: string, body: { featured: boolean }): Promise<{ project: ProjectDetail }> {
    const { data } = await api.patch<{ project: ProjectDetail }>(`/admin/projects/${encodeURIComponent(id)}/featured`, body);
    return data;
  },
};
