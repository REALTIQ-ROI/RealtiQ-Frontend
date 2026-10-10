/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseAudit } from './auditReader';

describe('audit reading parts', () => {
  it('preserves the delivery guide feature and improvement blocks and its quote/timeline sections', () => {
    const source = readFileSync('realtiq-delivery-plan.md', 'utf8');
    const chapters = parseAudit(source);
    const output = chapters.flatMap(chapter => chapter.parts.map(part => part.markdown)).join('\n');
    expect(chapters).toHaveLength(5);
    expect(output.match(/^#### N\d{2}.*$/gm)).toHaveLength(9);
    expect(output.match(/^#### I\d{2}.*$/gm)).toHaveLength(13);
    expect(output.match(/^#### [NI]\d{2}.*$/gm)).toEqual(source.match(/^#### [NI]\d{2}.*$/gm));
    expect(chapters[2].title).toContain('quotation');
    expect(chapters[3].title).toContain('Timeline');
  });
  it('retains all combined primary rows and pages the checklist before its later subheading', () => {
    const source = readFileSync('combined-current-scope.md', 'utf8');
    const chapters = parseAudit(source);
    const table = chapters.find(chapter => chapter.title === 'Combined primary master table')!;
    const sourceRows = source.split('## Combined primary master table')[1].split('\n## ')[0].match(/^\| AUD-.*$/gm);
    expect(sourceRows).toHaveLength(1250);
    expect(table.parts.flatMap(part => part.markdown.match(/^\| AUD-.*$/gm) ?? [])).toEqual(sourceRows);
    const checklist = chapters.find(chapter => chapter.title === 'Shared actionable checklist')!;
    expect(checklist.parts.length).toBeGreaterThan(10);
    const outputTasks = checklist.parts.flatMap(part => part.markdown.match(/^- \[ \].*$/gm) ?? []);
    const sourceTasks = source.split('## Shared actionable checklist')[1].split('\n## ')[0].match(/^- \[ \].*$/gm);
    expect(outputTasks).toEqual(sourceTasks);
  });
  it('paginates unnumbered report tables without dropping rows or trailing notes', () => {
    const rows = Array.from({ length: 170 }, (_, index) => `| AUD-${index} | Detail |`).join('\n');
    const parts = parseAudit(`# Report\n\n## Joint scope\n\nPreface\n\n| ID | Work |\n|---|---|\n${rows}\n\nFinal note`)[0].parts;
    expect(parts).toHaveLength(3);
    expect(parts.flatMap(part => part.markdown.match(/^\| AUD-.*$/gm) ?? [])).toEqual(rows.split('\n'));
    expect(parts.every(part => part.markdown.includes('| ID | Work |'))).toBe(true);
    expect(parts[2].markdown).toContain('Final note');
  });
  it('retains every primary requirement and checklist item from the actual report', () => {
    const source = readFileSync('needed-updates.md', 'utf8');
    const chapters = parseAudit(source);
    const output = chapters.flatMap(chapter => chapter.parts.map(part => part.markdown)).join('\n');
    expect(chapters).toHaveLength(20);
    expect(output.match(/^#### AUD-.*$/gm)).toEqual(source.match(/^#### AUD-.*$/gm));
    expect(output.match(/^- \[ \].*$/gm)).toEqual(source.match(/^- \[ \].*$/gm));
    expect(output).toContain('Audit dates:');
    expect(output).toContain('## 20. Audit Limitations and Confidence');
    expect(chapters[17].parts.length).toBeGreaterThan(1);
  });
  it('keeps introductions and final text when splitting a long checklist', () => {
    const tasks = Array.from({ length: 170 }, (_, i) => `- [ ] Task ${i}`).join('\n');
    const parts = parseAudit(`# Report\n\n## 1. Tasks\n\nIntroduction\n\n${tasks}\n\nFinal note`)[0].parts;
    expect(parts).toHaveLength(3);
    expect(parts[2].markdown).toContain('Final note');
    expect(parts.every(part => part.markdown.includes('Introduction'))).toBe(true);
  });
});
