export const IGNORE_IMPORT_COLUMN = '__ignore__';

export interface ImportColumnMappingDraft { columnNumber: string; field: string }
export interface ProjectImportMappingRequest { mappings: Array<{ columnNumber: number; field: string | null }> }

export const buildProjectImportMapping = (drafts: ImportColumnMappingDraft[], eligibleFields: string[]): ProjectImportMappingRequest => {
  const eligible = new Set(eligibleFields);
  const mappings: ProjectImportMappingRequest['mappings'] = [];
  const columns = new Set<number>();
  const fields = new Set<string>();
  for (const draft of drafts) {
    if (!draft.columnNumber.trim() && !draft.field) continue;
    const columnNumber = Number(draft.columnNumber);
    if (!Number.isSafeInteger(columnNumber) || columnNumber <= 0) throw new Error('Each mapped source column must use a positive whole-number index.');
    if (!draft.field) throw new Error(`Choose a canonical field or explicitly ignore source column ${columnNumber}.`);
    if (columns.has(columnNumber)) throw new Error(`Source column ${columnNumber} appears more than once.`);
    columns.add(columnNumber);
    if (draft.field === IGNORE_IMPORT_COLUMN) {
      mappings.push({ columnNumber, field: null });
      continue;
    }
    if (!eligible.has(draft.field)) throw new Error(`The field ${draft.field} is not eligible for this project import.`);
    if (fields.has(draft.field)) throw new Error(`The field ${draft.field} is mapped from more than one source column.`);
    fields.add(draft.field);
    mappings.push({ columnNumber, field: draft.field });
  }
  if (!mappings.length) throw new Error('Add at least one source-column mapping before saving.');
  return { mappings };
};

export const parseCsvHeader = (source: string): string[] => {
  const headers: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (!quoted && (character === ',' || character === '\n' || character === '\r')) {
      headers.push(value.trim());
      value = '';
      if (character !== ',') break;
    } else value += character;
  }
  if (value || !headers.length) headers.push(value.trim());
  return headers;
};
