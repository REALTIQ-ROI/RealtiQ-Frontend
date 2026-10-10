export interface AuditPart { title: string; markdown: string }
export interface AuditChapter { title: string; parts: AuditPart[] }

/** Split at Markdown headings and complete list lines, retaining every source line. */
export function parseAudit(markdown: string): AuditChapter[] {
  const chunks = markdown.replace(/\r\n/g, '\n').split(/(?=^## \d+\. )/m);
  const preamble = chunks[0].startsWith('## ') ? '' : chunks.shift() ?? '';
  return chunks.map((chunk, index) => {
    const newline = chunk.indexOf('\n');
    const heading = chunk.slice(0, newline);
    const title = heading.replace(/^## /, '');
    const body = chunk.slice(newline + 1);
    const sections = body.split(/(?=^### )/m);
    const introduction = sections.length > 1 && !sections[0].startsWith('### ') ? sections.shift()! : '';
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
        parts.push({ title: section.match(/^### (.+)/m)?.[1] ?? 'Read section', markdown: section });
      }
    }
    return { title, parts: parts.map(part => ({ ...part, markdown: `${index === 0 ? preamble : ''}${heading}\n\n${introduction}${part.markdown}` })) };
  });
}
