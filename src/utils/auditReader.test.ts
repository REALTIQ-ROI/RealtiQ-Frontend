/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseAudit } from './auditReader';

describe('audit reading parts', () => {
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
