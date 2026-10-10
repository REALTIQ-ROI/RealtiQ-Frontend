export interface AuditPart { title: string; markdown: string }
export interface AuditChapter { title: string; parts: AuditPart[] }

function splitLongTables(section: string): string[] {
  const lines = section.split('\n');
  const output: string[] = [];
  let pending: string[] = [];
  for (let index = 0; index < lines.length;) {
    if (lines[index].trimStart().startsWith('|') && /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(lines[index + 1] ?? '')) {
      let end = index + 2;
      while (end < lines.length && lines[end].trimStart().startsWith('|')) end++;
      const rows = lines.slice(index + 2, end);
      if (rows.length > 80) {
        const header = lines.slice(index, index + 2);
        for (let offset = 0; offset < rows.length; offset += 80) {
          pending.push(...header, ...rows.slice(offset, offset + 80));
          if (offset + 80 < rows.length) { output.push(pending.join('\n')); pending = []; }
        }
      } else pending.push(...lines.slice(index, end));
      index = end;
    } else pending.push(lines[index++]);
  }
  if (pending.length) output.push(pending.join('\n'));
  return output;
}

/** Split at Markdown headings and complete list lines, retaining every source line. */
export function parseAudit(markdown: string): AuditChapter[] {
  const chunks = markdown.replace(/\r\n/g, '\n').split(/(?=^## )/m);
  const preamble = chunks[0].startsWith('## ') ? '' : chunks.shift() ?? '';
  return chunks.map((chunk, index) => {
    const newline = chunk.indexOf('\n');
    const heading = chunk.slice(0, newline);
    const title = heading.replace(/^## /, '');
    const body = chunk.slice(newline + 1);
    const sections = body.split(/(?=^### )/m);
    // Repeat only a short introduction; long tables/checklists must be paged themselves.
    const introduction = sections.length > 1 && !sections[0].startsWith('### ') && sections[0].split('\n').length <= 80 ? sections.shift()! : '';
    const parts: AuditPart[] = [];
    for (const section of sections) {
      // The master checklist contains 1,252 rows. Read 80 at a time without dropping any.
      const lines = section.split('\n');
      const firstTask = lines.findIndex(line => line.startsWith('- [ ]'));
      if (firstTask >= 0 && lines.filter(line => line.startsWith('- [ ]')).length > 80) {
        const prefix = lines.slice(0, firstTask).join('\n');
        const tasks = lines.slice(firstTask);
        for (let offset = 0; offset < tasks.length; offset += 80) {
          parts.push({ title: `Checklist · part ${parts.length + 1}`, markdown: `${prefix}\n${tasks.slice(offset, offset + 80).join('\n')}` });
        }
      } else {
        const pages = splitLongTables(section);
        const topic = section.match(/^### (.+)/m)?.[1] ?? 'Read section';
        pages.forEach((page, index) => parts.push({ title: pages.length > 1 ? `${topic} · table part ${index + 1}` : topic, markdown: page }));
      }
    }
    return { title, parts: parts.map(part => ({ ...part, markdown: `${index === 0 ? preamble : ''}${heading}\n\n${introduction}${part.markdown}` })) };
  });
}
