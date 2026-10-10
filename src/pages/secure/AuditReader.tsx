import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, ArrowRight, BookOpen, Search } from 'lucide-react';
import markdown from '../../../needed-updates.md?raw';
import { parseAudit } from '../../utils/auditReader';
import './auditReader.css';

const plugins = [remarkGfm];
const chapters = parseAudit(markdown);

export default function AuditReader() {
  const [query, setQuery] = useState('');
  const search = useDeferredValue(query.trim().toLowerCase());
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const previous = document.title;
    document.title = 'REALTIQ · Confidential Audit';
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex, nofollow, noarchive';
    document.head.append(meta);
    return () => { document.title = previous; meta.remove(); };
  }, []);

  const matches = useMemo(() => chapters.map(chapter => chapter.parts
    .map((part, index) => ({ part, index }))
    .filter(({ part }) => search.split(/\s+/).every(word => part.markdown.toLowerCase().includes(word)))), [search]);
  const requestedChapter = Number(params.get('section') ?? 1) - 1;
  const chapterIndex = matches[requestedChapter]?.length ? requestedChapter : matches.findIndex(parts => parts.length > 0);
  const chapter = chapters[chapterIndex];
  const matchingParts = matches[chapterIndex] ?? [];
  const requestedPart = Number(params.get('part') ?? 1) - 1;
  const current = matchingParts.find(({ index }) => index === requestedPart) ?? matchingParts[0];
  const position = matchingParts.indexOf(current);
  const previousChapter = matches.findLastIndex((parts, index) => index < chapterIndex && parts.length > 0);
  const nextChapter = matches.findIndex((parts, index) => index > chapterIndex && parts.length > 0);
  const totalMatches = matches.reduce((total, parts) => total + parts.length, 0);
  const navigate = (section: number, part = 0) => setParams({ section: String(section + 1), part: String(part + 1) });

  return <div className="audit-shell">
    <header className="audit-topbar">
      <Link className="audit-brand" to="/"><BookOpen size={22} /> REALTIQ <span>Audit reader</span></Link>
      <div className="audit-top-actions"><span>Project audit · October 2026</span></div>
    </header>
    <div className="audit-layout">
      <aside className="audit-sidebar" aria-label="Report navigation">
        <p className="audit-eyebrow">CONFIDENTIAL REPORT</p><h1>Requirements &amp;<br />scope audit</h1>
        <label className="audit-search"><Search size={17} /><input type="search" placeholder="Search report or AUD ID" aria-label="Search the complete audit" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <p className="audit-search-status" aria-live="polite">{search ? `${totalMatches} matching reading parts` : `${chapters.length} sections · complete report`}</p>
        <nav>{chapters.map((item, index) => <button key={item.title} disabled={!matches[index]?.length} aria-current={index === chapterIndex ? 'page' : undefined} onClick={() => navigate(index, matches[index][0].index)}><span>{String(index + 1).padStart(2, '0')}</span>{item.title.replace(/^\d+\. /, '')}</button>)}</nav>
        <p className="audit-sidebar-note">Source: needed-updates.md<br />All details retained. Long sections are divided into reading parts.</p>
      </aside>
      <main className="audit-main" id="audit-content">
        {!current ? <div className="audit-state"><Search size={32} /><h2>No matching details</h2><p>Try a shorter phrase, a requirement ID or an RQS reference.</p><button onClick={() => setQuery('')}>Clear search</button></div> : <>
          <div className="audit-reading-bar"><span>Section {chapterIndex + 1} of {chapters.length}</span><span>Reading part {position + 1} of {matchingParts.length}</span></div>
          {chapter.parts.length > 1 && <label className="audit-part-select">Jump to a topic<select value={current.index} onChange={event => navigate(chapterIndex, Number(event.target.value))}>{matchingParts.map(({ part, index }) => <option key={index} value={index}>{part.title}</option>)}</select></label>}
          <article className="audit-document" key={`${chapterIndex}-${current.index}`}>
            <Markdown remarkPlugins={plugins} skipHtml components={{
              table: ({ children }) => <div className="audit-table-scroll" tabIndex={0} role="region" aria-label="Scrollable report table"><table>{children}</table></div>,
              a: ({ href, children }) => /^(https?:|mailto:)/i.test(href ?? '') ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
            }}>{current.part.markdown}</Markdown>
          </article>
          <footer className="audit-pagination">
            <button disabled={previousChapter < 0 && position === 0} onClick={() => position > 0 ? navigate(chapterIndex, matchingParts[position - 1].index) : navigate(previousChapter, matches[previousChapter].at(-1)!.index)}><ArrowLeft size={17} /> Previous</button>
            <span>{chapter.title}</span>
            <button disabled={position === matchingParts.length - 1 && nextChapter < 0} onClick={() => position < matchingParts.length - 1 ? navigate(chapterIndex, matchingParts[position + 1].index) : navigate(nextChapter, matches[nextChapter][0].index)}>Next <ArrowRight size={17} /></button>
          </footer>
        </>}
      </main>
    </div>
  </div>;
}
