import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import NewsletterSignup from '../../components/layout/NewsletterSignup';
import ProjectCard from '../../components/project/ProjectCard';
import PropertyCard from '../../components/property/PropertyCard';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import { group07Service, type Group07PublicPost } from '../../services/group07Service';
import { projectService } from '../../services/projectService';
import { propertyService } from '../../services/propertyService';
import type { ProjectCard as ProjectCardType, Property } from '../../types';
import { canonicalQueryParams } from '../../utils/catalogueQuery';

const wrap = 'mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20';
const textLink = 'text-sm font-bold underline underline-offset-4 hover:text-primary';
const Heading = ({ title, to }: { title: string; to?: string }) => <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><h2 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>{to ? <Link to={to} className={textLink}>See all →</Link> : null}</div>;

const Home = () => {
  const navigate = useNavigate();
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [propertyRefresh, setPropertyRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState<ProjectCardType[]>([]);
  const [posts, setPosts] = useState<Group07PublicPost[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [showcaseIndex, setShowcaseIndex] = useState(0);

  useEffect(() => {
    let live = true;
    void projectService.listProjects({ featured: true, publicationState: 'published', limit: 12 })
      .then((result) => { if (live) setProjects(result.projects.filter((item) => item.isFeatured && item.isPublished === true)); })
      .catch(() => { if (live) setProjects([]); })
      .finally(() => { if (live) setProjectsLoading(false); });
    void group07Service.featuredPosts('homepage')
      .then((result) => { if (live && result.state === 'configured') setPosts(result.posts); })
      .catch(() => { if (live) setPosts([]); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void propertyService.getProperties({ featured: true, page: 1, limit: 4 }, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setFeaturedProperties(result.properties.filter((item) => item.featured === true)); })
      .catch(() => { if (!controller.signal.aborted) setError('Unable to load featured properties.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [propertyRefresh]);

  const showcase = projects.length ? projects[showcaseIndex % projects.length] : null;
  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(`/properties?${canonicalQueryParams({ search: search.trim() || undefined }).toString()}`);
  };

  return <PublicLayout><div className="bg-surface text-on-surface">
    <section className="relative bg-primary-container px-4 py-20 text-center text-white sm:px-6 lg:py-32" style={{ backgroundImage: 'linear-gradient(90deg,rgba(0,0,0,.74),rgba(17,28,45,.38)),url(/home-skyline.svg)', backgroundSize: 'cover', backgroundPosition: 'center bottom' }}>
      <p className="text-xs font-bold uppercase tracking-[.3em] text-white/80">Find · Evaluate · Buy</p>
      <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">Find property for sale across Nigeria.</h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">Explore homes, developments and commercial buildings. Compare your options and find what fits.</p>
      <form onSubmit={onSearch} className="mx-auto mt-10 max-w-5xl rounded-2xl bg-white p-3 text-left text-on-surface shadow-2xl sm:p-4"><div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"><label className="block px-3 py-1"><span className="block text-[11px] font-bold uppercase tracking-widest text-secondary">Location or keyword</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search an area, estate or property" className="mt-2 w-full border-0 bg-transparent text-base font-semibold outline-none placeholder:text-secondary/70" /></label><Link to="/properties" className="rounded-xl border border-outline-variant/60 px-6 py-4 text-center text-sm font-bold hover:bg-surface-container-low">All filters</Link><button type="submit" className="rounded-xl bg-primary px-8 py-4 text-sm font-bold text-white hover:opacity-85">Search</button></div></form>
      <div className="mt-6 flex flex-wrap justify-center gap-5 text-sm font-semibold"><Link className="underline underline-offset-4" to="/projects">Browse developments</Link><Link className="underline underline-offset-4" to="/properties?mapActive=true">Search on the map</Link></div>
    </section>

    {showcase ? <section className={`${wrap} pb-0`} aria-label="Project showcase"><div className="grid overflow-hidden rounded-3xl bg-primary-container text-white shadow-lg lg:grid-cols-2"><div className="min-h-72 bg-surface-container-high">{showcase.coverImage?.url ? <img src={showcase.coverImage.url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full min-h-72 items-center justify-center text-secondary"><span className="material-symbols-outlined text-7xl">apartment</span></div>}</div><div className="flex flex-col justify-center p-8 sm:p-12"><p className="text-xs font-bold uppercase tracking-[.2em] text-secondary-fixed-dim">Project showcase</p><h2 className="mt-5 text-4xl font-black">{showcase.name}</h2><p className="mt-3 text-sm text-white/70">{[showcase.location?.area, showcase.location?.city, showcase.location?.state].filter(Boolean).join(', ')}{showcase.developer?.name ? ` · by ${showcase.developer.name}` : ''}</p>{showcase.shortDescription ? <p className="mt-6 leading-7 text-white/80">{showcase.shortDescription}</p> : null}<p className="mt-6 text-sm text-white/70">{showcase.availableUnits} of {showcase.totalUnits} units available</p><div className="mt-8 flex items-center gap-4"><Link to={`/projects/${showcase.slug || showcase._id}`} className="rounded-xl bg-secondary-container px-6 py-3 text-sm font-bold text-on-surface">View project</Link>{projects.length > 1 ? <div className="flex gap-2"><button aria-label="Previous project" type="button" onClick={() => setShowcaseIndex((i) => (i - 1 + projects.length) % projects.length)} className="rounded-full border border-white/40 px-3 py-2">←</button><button aria-label="Next project" type="button" onClick={() => setShowcaseIndex((i) => (i + 1) % projects.length)} className="rounded-full border border-white/40 px-3 py-2">→</button></div> : null}</div></div></div></section> : null}

    <section className={wrap}><Heading title="Featured developments" to="/projects" />{projectsLoading ? <LoadingState label="Loading developments..." /> : projects.length ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{projects.slice(0, 3).map((item) => <ProjectCard key={item._id} project={item} />)}</div> : <p className="rounded-2xl border bg-white p-8 text-secondary">Featured developments are not available right now. <Link className={textLink} to="/projects">Browse all developments</Link></p>}</section>
    <section className={`${wrap} pt-0`}><Heading title="Featured properties" to="/properties" />{loading ? <LoadingState label="Loading properties..." /> : null}{error ? <ErrorState message={error} onRetry={() => { setLoading(true); setError(''); setPropertyRefresh((value) => value + 1); }} /> : null}{!loading && !error ? featuredProperties.length ? <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">{featuredProperties.map((item) => <PropertyCard key={item._id} property={item} showCompareAction />)}</div> : <p className="rounded-2xl border bg-white p-8 text-secondary">Featured properties are not available right now. <Link className={textLink} to="/properties">Browse all properties</Link></p> : null}</section>

    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8"><div className="grid overflow-hidden rounded-2xl border border-outline-variant/50 bg-white md:grid-cols-2"><div className="min-h-56 bg-surface-container-high" style={{ backgroundImage: 'url(/home-skyline.svg)', backgroundSize: 'cover', backgroundPosition: 'center bottom' }} /><div className="flex flex-col justify-center p-8 sm:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-secondary">Explore by area</p><h2 className="mt-3 text-2xl font-black">Find a place that fits your plans</h2><p className="mt-3 text-sm leading-6 text-secondary">Search current listings by the locations and details that matter to you.</p><Link className="mt-5 text-sm font-bold underline underline-offset-4" to="/properties">Explore areas →</Link></div></div></section>

    <section className="bg-surface-container-low"><div className={wrap}><Heading title="Search the way you buy" /><div className="grid gap-5 md:grid-cols-3">{[{ icon: 'map', title: 'Search on the map', body: 'Explore properties by location and keep results in view.', to: '/properties?mapActive=true' }, { icon: 'compare_arrows', title: 'Compare up to four', body: 'Review your shortlisted properties side by side.', to: '/compare' }, { icon: 'notifications', title: 'Alerts that find you', body: 'Save a search to follow new and changed listings.', to: '/properties' }].map((item) => <Link key={item.title} to={item.to} className="rounded-2xl border border-outline-variant/50 bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg"><span className="material-symbols-outlined rounded-xl bg-secondary-container p-3 text-secondary">{item.icon}</span><h3 className="mt-6 text-lg font-black">{item.title}</h3><p className="mt-2 text-sm leading-6 text-secondary">{item.body}</p></Link>)}</div></div></section>

    <section className={wrap}><div className="grid gap-8 lg:grid-cols-2 lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-secondary">Evaluate</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Know more before you make an offer</h2><p className="mt-5 max-w-xl leading-7 text-on-surface-variant">Explore current listings, compare properties and use the available planning tools to assess your options.</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/properties" className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">Explore properties</Link><Link to="/tools/roi-calculator" className="rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold">Plan your return</Link></div></div><div className="grid gap-4 sm:grid-cols-2">{[{ icon: 'query_stats', title: 'Compare the details', body: 'See listing facts together with their current status.' }, { icon: 'calculate', title: 'Plan your next move', body: 'Explore a scenario with the return calculator.' }].map((item) => <div key={item.title} className="rounded-2xl bg-surface-container-high p-7"><span className="material-symbols-outlined text-4xl text-secondary">{item.icon}</span><h3 className="mt-12 text-xl font-black">{item.title}</h3><p className="mt-2 text-sm leading-6 text-on-surface-variant">{item.body}</p></div>)}</div></div></section>

    <section className="bg-surface-container-low"><div className={wrap}><div className="grid gap-10 lg:grid-cols-2 lg:items-center"><div className="flex min-h-72 items-end overflow-hidden rounded-3xl bg-surface-container-high p-7" style={{ backgroundImage: 'url(/home-skyline.svg)', backgroundPosition: 'center bottom', backgroundSize: 'cover' }}><span className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white">Explore from wherever you are</span></div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-secondary">Buy from anywhere</p><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Find a property in Nigeria, wherever you are.</h2><p className="mt-5 leading-7 text-on-surface-variant">Shortlist online, arrange a viewing or inspection, request protected documents and follow the purchase process on REALTIQ.</p><Link className={`${textLink} mt-6 inline-block`} to="/properties">Start exploring →</Link></div></div><div className="mt-20"><Heading title="From search to keys, in five steps" /><ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">{[{ title: 'Find it', body: 'Search and compare properties.' }, { title: 'See it', body: 'Explore available tours and viewings.' }, { title: 'Have it inspected', body: 'Arrange an independent inspection.' }, { title: 'Check the papers', body: 'Request the documents you need.' }, { title: 'Pay safely', body: 'Review agreed terms and payment options.' }].map((item, index) => <li key={item.title} className="border-t-2 border-outline-variant pt-5"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-black text-white">{index + 1}</span><h3 className="mt-5 font-black">{item.title}</h3><p className="mt-2 text-sm leading-6 text-secondary">{item.body}</p></li>)}</ol></div></div></section>

    <section className={wrap}><Heading title="Professionals on REALTIQ" to="/partners" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{ icon: 'fact_check', title: 'Inspectors', text: 'Independent property visits and reports' }, { icon: 'straighten', title: 'Surveyors', text: 'Boundary and site-plan expertise' }, { icon: 'gavel', title: 'Legal partners', text: 'Document and agreement services' }, { icon: 'home_pin', title: 'Valuers', text: 'Independent valuation services' }].map((item) => <Link to="/partners" key={item.title} className="rounded-2xl border border-outline-variant/50 bg-white p-6 hover:shadow-md"><span className="material-symbols-outlined text-3xl text-secondary">{item.icon}</span><h3 className="mt-6 font-black">{item.title}</h3><p className="mt-2 text-sm text-secondary">{item.text}</p></Link>)}</div></section>

    <section className="bg-surface-container-low"><div className={wrap}><Heading title="See what’s new" to="/community" />{posts.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{posts.slice(0, 4).map((post) => <article key={post.id} className="overflow-hidden rounded-2xl bg-white"><div className="aspect-[4/5] bg-surface-container-high">{post.media[0]?.coverUrl || post.media[0]?.url ? <img src={post.media[0].coverUrl || post.media[0].url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-secondary"><span className="material-symbols-outlined text-6xl">forum</span></div>}</div><div className="p-5">{post.sponsored ? <span className="rounded bg-secondary-container px-2 py-1 text-[10px] font-black uppercase text-on-secondary-container">Sponsored</span> : null}<h3 className="mt-3 text-sm font-black">{post.author.name}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-secondary">{post.caption}</p></div></article>)}</div> : <p className="rounded-2xl bg-white p-8 text-secondary">Explore property conversations and updates from the REALTIQ community. <Link className={textLink} to="/community">Open community</Link></p>}</div></section>

    <section className="bg-surface-container-low pb-16 sm:pb-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><NewsletterSignup /></div></section>

    <section className="bg-primary-container text-white"><div className={wrap}><p className="text-xs font-bold uppercase tracking-[.2em] text-secondary-fixed-dim">Sell and connect</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Reach buyers wherever they live</h2><p className="mt-4 max-w-2xl leading-7 text-white/70">Choose the workspace that fits the way you sell or offer your service.</p><div className="mt-9 grid gap-5 lg:grid-cols-3">{[{ title: 'Selling a home or building?', text: 'Create a listing from your Seller Portal.', cta: 'Start selling', to: '/register' }, { title: 'Building a development?', text: 'Manage projects and units through a Developer profile.', cta: 'Explore developments', to: '/projects' }, { title: 'Offering a professional service?', text: 'Join the network of independent property professionals.', cta: 'Explore partners', to: '/partners' }].map((item) => <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-7"><h3 className="text-xl font-black">{item.title}</h3><p className="mt-3 min-h-16 text-sm leading-6 text-white/70">{item.text}</p><Link to={item.to} className="mt-6 inline-flex rounded-xl bg-secondary-container px-5 py-3 text-sm font-bold text-on-secondary-container">{item.cta}</Link></div>)}</div></div></section>
  </div></PublicLayout>;
};

export default Home;
