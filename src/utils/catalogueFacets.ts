export const summarizeCatalogueFacets = (value: unknown): string => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([group, entries]) => {
      if (!entries || typeof entries !== 'object' || Array.isArray(entries)) return [];
      const counts = Object.entries(entries as Record<string, unknown>)
        .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]));
      return counts.length
        ? [`${group.replaceAll('_', ' ')}: ${counts.slice(0, 3).map(([name, count]) => `${name.replaceAll('_', ' ')} ${count}`).join(', ')}`]
        : [];
    })
    .slice(0, 4)
    .join(' · ');
};
