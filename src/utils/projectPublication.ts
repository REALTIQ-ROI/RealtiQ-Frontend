interface ProjectPublicationLike {
  isPublished?: unknown;
  published?: unknown;
  publicationState?: unknown;
  publishedAt?: unknown;
  status?: unknown;
}

const truthyPublishedValues = new Set<unknown>([true, 'true', 1, '1']);
const falseyPublishedValues = new Set<unknown>([false, 'false', 0, '0']);

export const isProjectExplicitlyUnpublished = (project: ProjectPublicationLike) => {
  const value = project.isPublished ?? project.published;
  if (falseyPublishedValues.has(value)) return true;
  if (typeof project.publicationState === 'string') {
    const state = project.publicationState.toLowerCase();
    return state === 'unpublished' || state === 'draft';
  }
  if (typeof project.status === 'string') {
    const status = project.status.toLowerCase();
    return status === 'draft' || status === 'suspended';
  }
  return false;
};

export const isProjectPublished = (project: ProjectPublicationLike) => {
  const value = project.isPublished ?? project.published;
  if (truthyPublishedValues.has(value)) return true;
  if (falseyPublishedValues.has(value)) return false;
  if (typeof project.publicationState === 'string') return project.publicationState.toLowerCase() === 'published';
  return typeof project.publishedAt === 'string' && project.publishedAt.trim().length > 0;
};

export const normalizeProjectPublication = <T extends ProjectPublicationLike>(project: T): T & { isPublished: boolean } => ({
  ...project,
  isPublished: isProjectPublished(project),
});

export const isPublicPropertyVisible = <T extends { project?: ProjectPublicationLike | null }>(property: T) => {
  if (!property.project) return true;
  if (isProjectExplicitlyUnpublished(property.project)) return false;
  return isProjectPublished(property.project);
};
