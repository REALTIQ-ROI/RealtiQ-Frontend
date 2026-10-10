import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, ArrowRight, BookOpen, Search } from 'lucide-react';
import summary from '../../../realtiq-action-summary.md?raw';
import deliveryPlan from '../../../realtiq-delivery-plan.md?raw';
import AuditBudgetCalculator from './AuditBudgetCalculator';
import { parseAudit } from '../../utils/auditReader';
import './auditReader.css';

const plugins = [remarkGfm];
const reports = [
  { id: 'plan', name: 'New features, improvements, quote and timeline', file: 'realtiq-delivery-plan.md', load: async () => deliveryPlan },
  { id: 'summary', name: 'Background, current inventory and glossary', file: 'realtiq-action-summary.md', load: async () => summary },
  { id: 'combined', name: 'Combined frontend + backend scope', file: 'combined-current-scope.md', load: async () => (await import('../../../combined-current-scope.md?raw')).default },
  { id: 'backend', name: 'Detailed backend audit', file: 'backend-needed-updates.md', load: async () => (await import('../../../backend-needed-updates.md?raw')).default },
  { id: 'frontend', name: 'Original frontend audit', file: 'needed-updates.md', load: async () => (await import('../../../needed-updates.md?raw')).default },
];
const summaryChapters = parseAudit(summary);
const planChapters = parseAudit(deliveryPlan);
const emptyChapters: ReturnType<typeof parseAudit> = [];

export default function AuditReader() {
  const [query, setQuery] = useState('');
  const search = useDeferredValue(query.trim().toLowerCase());
  const [params, setParams] = useSearchParams();
  const report = reports.find(item => item.id === params.get('view')) ?? reports[0];
  const [documents, setDocuments] = useState<Record<string, ReturnType<typeof parseAudit>>>({ plan: planChapters, summary: summaryChapters });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const chapters = documents[report.id] ?? emptyChapters;
  useEffect(() => {
    if (documents[report.id]) return;
    let active = true;
    report.load().then(markdown => {
      if (active) setDocuments(previous => ({ ...previous, [report.id]: parseAudit(markdown) }));
    }).catch(() => {
      if (active) setErrors(previous => ({ ...previous, [report.id]: 'Could not load this report. Reload the page to try again.' }));
    });
    return () => { active = false; };
  }, [report, documents]);
  const chooseReport = (id: string) => { setQuery(''); setParams({ view: id }); };

  useEffect(() => {
    const previous = document.title;
    document.title = 'REALTIQ · Combined scope audit';
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex, nofollow, noarchive';
    document.head.append(meta);
    return () => { document.title = previous; meta.remove(); };
  }, []);

  const matches = useMemo(() => chapters.map(chapter => chapter.parts
    .map((part, index) => ({ part, index }))
    .filter(({ part }) => search.split(/\s+/).every(word => part.markdown.toLowerCase().includes(word)))), [search, chapters]);
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
  const navigate = (section: number, part = 0) => setParams({ view: report.id, section: String(section + 1), part: String(part + 1) });

  return <div className="audit-shell">
    <header className="audit-topbar">
      <Link className="audit-brand" to="/"><BookOpen size={22} /> REALTIQ <span>Audit reader</span></Link>
      <div className="audit-top-actions"><span>Frontend + backend review · October 2026</span></div>
    </header>
    <div className="audit-layout">
      <aside className="audit-sidebar" aria-label="Report navigation">
        <p className="audit-eyebrow">COMBINED PROJECT REVIEW</p><h1>Current implementation<br />&amp; remaining work</h1>
        <label className="audit-report-select">Choose report<select value={report.id} onChange={event => chooseReport(event.target.value)}>{reports.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="audit-search"><Search size={17} /><input type="search" placeholder="Search report or AUD ID" aria-label="Search the complete audit" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <p className="audit-search-status" aria-live="polite">{search ? `${totalMatches} matching reading parts` : `${chapters.length} sections · complete report`}</p>
        <nav>{chapters.map((item, index) => <button key={item.title} disabled={!matches[index]?.length} aria-current={index === chapterIndex ? 'page' : undefined} onClick={() => navigate(index, matches[index][0].index)}><span>{String(index + 1).padStart(2, '0')}</span>{item.title.replace(/^\d+\. /, '')}</button>)}</nav>
        <p className="audit-sidebar-note">Source: {report.file}<br />Long sections are divided into reading parts. Search covers the selected report.</p>
      </aside>
      <main className="audit-main" id="audit-content">
        <section className="audit-context" aria-label="Combined audit guidance">
          <strong>{report.id === 'frontend' ? 'Earlier frontend findings need the combined corrections' : 'Both repositories now inform this review'}</strong>
          <p>{report.id === 'frontend' ? 'Read this alongside the combined report: search, imports, title protection and tour adapters have reusable backend implementation. Some earlier missing-feature and commercial conclusions were revised.' : 'Existing source implementation, required corrections and possible additions are separated. Provider, database and production verification remain outstanding; the reports do not certify launch readiness.'}</p>
          <div className="audit-quick-links">
            <button onClick={() => chooseReport('plan')}>New features to add</button>
            <button onClick={() => { setQuery(''); setParams({ view: 'plan', section: '2' }); }}>Existing features to improve</button>
            <button onClick={() => { setQuery(''); setParams({ view: 'plan', section: '3' }); }}>Quotation</button>
            <button onClick={() => { setQuery(''); setParams({ view: 'plan', section: '4' }); }}>Timeline</button>
            <button onClick={() => chooseReport('combined')}>Full combined evidence</button>
          </div>
        </section>
        {!documents[report.id] ? <div className="audit-state" role="status">{errors[report.id] ?? 'Loading report…'}</div> : !current ? <div className="audit-state"><Search size={32} /><h2>No matching details</h2><p>Try a shorter phrase, a requirement ID or an RQS reference.</p><button onClick={() => setQuery('')}>Clear search</button></div> : <>
          <div className="audit-reading-bar"><span>Section {chapterIndex + 1} of {chapters.length}</span><span>Reading part {position + 1} of {matchingParts.length}</span></div>
          {chapter.parts.length > 1 && <label className="audit-part-select">Jump to a topic<select value={current.index} onChange={event => navigate(chapterIndex, Number(event.target.value))}>{matchingParts.map(({ part, index }) => <option key={index} value={index}>{part.title}</option>)}</select></label>}
          <article className="audit-document" key={`${report.id}-${chapterIndex}-${current.index}`}>
            <Markdown remarkPlugins={plugins} skipHtml components={{
              table: ({ children }) => <div className="audit-table-scroll" tabIndex={0} role="region" aria-label="Scrollable report table"><table>{children}</table></div>,
              a: ({ href, children }) => {
                const target = reports.find(item => item.file === href);
                return target ? <button className="audit-report-link" onClick={() => chooseReport(target.id)}>{children}</button> : /^(https?:|mailto:)/i.test(href ?? '') ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>;
              },
            }}>{current.part.markdown}</Markdown>
          </article>
          {((report.id === 'plan' && chapterIndex === 2) || (report.id === 'summary' && chapterIndex === 4)) && <AuditBudgetCalculator />}
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
