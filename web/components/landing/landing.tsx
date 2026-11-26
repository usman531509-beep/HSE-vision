'use client';

/* Visual HSE landing page, laid out after the user's reference: centred serif wordmark nav, a rounded photo hero
   with a giant word and a slider, a filter bar, a card carousel, a two-column feature block — plus a three.js
   model of the plant. Figures come from lib/data.ts. Photos are from Pexels (credited in the footer). */

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Camera, ChevronDown, Clock, FileText, Gauge, Lock, MapPin, Menu, Mouse, Search, ShieldCheck, X,
} from 'lucide-react';
import { kpi, site, zones, type Range } from '@/lib/data';

const Plant3D = dynamic(() => import('./plant3d').then((m) => m.Plant3D), { ssr: false, loading: () => <div className="p3-loading">Loading the 3D hall…</div> });

const SLIDES = [
  { img: '/landing/hero-team.jpg', alt: 'Three workers in hard hats and coveralls walking through a steel plant', cap: 'Shift handover · Press hall' },
  { img: '/landing/hero-inspector.jpg', alt: 'An engineer in an orange hard hat and high-visibility vest inspecting a large machine', cap: 'Guard inspection · Line 2' },
  { img: '/landing/hero-aisle.jpg', alt: 'A long aisle of green industrial machines with workers at their stations', cap: 'Machine aisle · Zone 7' },
  { img: '/landing/hero-hall.jpg', alt: 'A worker in a hard hat and reflective jacket walking toward a forklift in a hall', cap: 'Walkway check · Dock 1' },
  { img: '/landing/hero-forklift.jpg', alt: 'A forklift carrying a wrapped pallet between tall stacks in a warehouse', cap: 'Forklift route · Dock 1' },
];

const ZONE_IMG: Record<string, string> = {
  'Press 3': '/landing/zone-press.jpg',
  'Zone 4 · Packing': '/landing/zone-packing.jpg',
  'Zone 7 · Conveyor': '/landing/zone-conveyor.jpg',
  'Tank B': '/landing/zone-tank.jpg',
  'Dock 1': '/landing/zone-dock.jpg',
  Compressor: '/landing/zone-compressor.jpg',
  'Line 2 · Molders': '/landing/zone-line2.jpg',
  'Zone 1 · Intake': '/landing/zone-intake.jpg',
};

const CREDITS: [string, string][] = [
  ['Steel plant team', 'https://www.pexels.com/photo/industrial-workers-in-safety-gear-at-steel-factory-32845683/'],
  ['Engineer, orange hard hat', 'https://www.pexels.com/photo/man-wearing-orange-hard-hat-2760241/'],
  ['Machine aisle', 'https://www.pexels.com/photo/people-working-in-factory-18293962/'],
  ['Worker in hall', 'https://www.pexels.com/photo/industrial-worker-in-modern-factory-setting-29988955/'],
  ['Forklift', 'https://www.pexels.com/photo/forklift-in-warehouse-17229385/'],
  ['Factory floor', 'https://www.pexels.com/photo/people-working-on-a-factory-11765539/'],
  ['Warehouse', 'https://www.pexels.com/photo/modern-warehouse-operations-with-employees-and-forklift-30824313/'],
  ['Steam', 'https://www.pexels.com/photo/industrial-worker-in-a-steamy-factory-setting-29411310/'],
  ['Engineer with tablet', 'https://www.pexels.com/photo/woman-in-white-hardhat-holding-silver-touchscreen-device-8960944/'],
  ['Engineer, steel plant', 'https://www.pexels.com/photo/engineer-in-industrial-factory-using-tablet-32845694/'],
];

const lvl = (s: number) => (s >= 70 ? 'act' : s >= 40 ? 'watch' : 'low');
const lvlWord = (s: number) => (s >= 70 ? 'Act' : s >= 40 ? 'Watch' : 'Low');
const RANGE_LABEL: Record<Range, string> = { shift: 'This shift', day: 'Last 24 hours', week: 'Last 7 days' };

/* ---------- Nav ---------- */
function Nav() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open]);
  const links = [['#zones', 'Zones'], ['#plant', '3D plant'], ['#product', 'Product'], ['#pilot', 'Pilot']];
  return (
    <header className="lp-nav">
      <nav className="lp-nav-links" aria-label="Page">
        {links.map(([h, t]) => <a key={h} href={h}>{t}</a>)}
      </nav>
      <Link href="/welcome" className="lp-word" aria-label="Visual HSE home">Visual HSE</Link>
      <div className="lp-nav-right">
        <span className="lp-live"><span aria-hidden="true" />Shift B live</span>
        <a href="#pilot" className="lp-talk">Let’s talk</a>
        <button type="button" className="lp-round" aria-expanded={open} aria-controls="lp-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>
      {open ? (
        <div id="lp-menu" className="lp-menu">
          {links.map(([h, t]) => <a key={h} href={h} onClick={() => setOpen(false)}>{t}</a>)}
          <Link href="/">Open the control room</Link>
          <Link href="/spatial">Full spatial view</Link>
          <Link href="/guide">User guide</Link>
        </div>
      ) : null}
    </header>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = SLIDES.length;
  const go = (d: number) => setI((x) => (x + d + n) % n);
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => setI((x) => (x + 1) % n), 6500);
    return () => clearTimeout(t);
  }, [i, paused, n]);
  const thumbs = [1, 2, 3].map((k) => (i + k) % n);

  return (
    <section className="lp-hero" aria-labelledby="hero-h" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {SLIDES.map((s, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={s.img} src={s.img} alt={k === i ? s.alt : ''} aria-hidden={k !== i} className={`lp-hero-img${k === i ? ' on' : ''}`} width={2200} height={1400} loading={k === 0 ? 'eager' : 'lazy'} />
      ))}
      <span className="lp-hero-shade" aria-hidden="true" />
      <p className="lp-giant" aria-hidden="true">VISUAL HSE</p>
      <div className="lp-hero-note">
        <p>Cameras and sensors watch the floor, check the permit, the lockout and the roster, and only then raise an alert. A person approves every report.</p>
        <ul>
          <li>Vision-AI</li>
          <li>IoT sensors</li>
          <li>Permits</li>
        </ul>
      </div>
      <div className="lp-hero-main">
        <h1 id="hero-h">See the risk before it becomes an incident</h1>
        <Link href="/" className="lp-pill-cta">
          <span className="lp-pill-icon"><ArrowRight size={16} /></span>
          Open the control room
        </Link>
      </div>
      <div className="lp-slider" role="group" aria-label="Hero photos">
        <button type="button" className="lp-ghost" aria-label="Previous photo" onClick={() => go(-1)}><ArrowLeft size={16} /></button>
        <div className="lp-dashes">
          {SLIDES.map((s, k) => (
            <button key={s.img} type="button" aria-label={`Photo ${k + 1}: ${s.cap}`} aria-current={k === i} onClick={() => setI(k)} className={k === i ? 'on' : ''} />
          ))}
        </div>
        <button type="button" className="lp-ghost" aria-label="Next photo" onClick={() => go(1)}><ArrowRight size={16} /></button>
      </div>
      <a href="#search" className="lp-scroll"><Mouse size={22} strokeWidth={1.5} />Scroll now</a>
      <div className="lp-inset">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SLIDES[(i + 1) % n].img} alt="" width={600} height={400} />
        <span className="lp-inset-cap">Next · {SLIDES[(i + 1) % n].cap}</span>
        <div className="lp-thumbs">
          {thumbs.map((k) => (
            <button key={k} type="button" onClick={() => setI(k)} aria-label={`Show ${SLIDES[k].cap}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SLIDES[k].img} alt="" width={120} height={80} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Filter bar + zone carousel ---------- */
type SevFilter = 'all' | 'act' | 'watch' | 'low';
function Zones() {
  const [q, setQ] = useState('');
  const [range, setRange] = useState<Range>('shift');
  const [sev, setSev] = useState<SevFilter>('all');
  const [applied, setApplied] = useState<{ q: string; sev: SevFilter }>({ q: '', sev: 'all' });
  const track = useRef<HTMLDivElement>(null);
  const k = kpi[range];

  const list = useMemo(() => {
    const t = applied.q.trim().toLowerCase();
    return [...zones]
      .sort((a, b) => b.score - a.score)
      .filter((z) => (applied.sev === 'all' || lvl(z.score) === applied.sev) && (!t || (z.name + ' ' + z.cause).toLowerCase().includes(t)));
  }, [applied]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setApplied({ q, sev });
    track.current?.scrollTo({ left: 0, behavior: 'smooth' });
    document.getElementById('zones')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const scroll = (d: number) => {
    const t = track.current;
    if (!t) return;
    const card = t.querySelector('article');
    t.scrollBy({ left: d * ((card?.clientWidth ?? 300) + 20), behavior: 'smooth' });
  };

  return (
    <>
      <form id="search" className="lp-search" onSubmit={submit} role="search" aria-label="Find a zone">
        <label className="lp-field">
          <MapPin size={16} aria-hidden="true" />
          <span className="lp-sr">Zone, machine or cause</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zone, machine or cause" />
        </label>
        <label className="lp-field">
          <Clock size={16} aria-hidden="true" />
          <span className="lp-sr">Time range</span>
          <select value={range} onChange={(e) => setRange(e.target.value as Range)}>
            {(Object.keys(RANGE_LABEL) as Range[]).map((r) => <option key={r} value={r}>{RANGE_LABEL[r]}</option>)}
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>
        <label className="lp-field">
          <Gauge size={16} aria-hidden="true" />
          <span className="lp-sr">Severity</span>
          <select value={sev} onChange={(e) => setSev(e.target.value as SevFilter)}>
            <option value="all">Any severity</option>
            <option value="act">Act · 70 and up</option>
            <option value="watch">Watch · 40 to 69</option>
            <option value="low">Low · under 40</option>
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>
        <button type="submit" className="lp-search-btn" aria-label="Show zones"><Search size={20} /></button>
      </form>
      <p className="lp-kpis" aria-live="polite">
        <b>{RANGE_LABEL[range]}:</b> site risk {k.risk}/100 · {k.alerts} real alerts · {k.silenced} held back after checks · {k.stops} machine {k.stops === 1 ? 'stop' : 'stops'} · {k.capa} open actions
      </p>

      <section id="zones" className="lp-zones" aria-labelledby="zones-h">
        <div className="lp-sec-head">
          <h2 id="zones-h">Zones that need you</h2>
          <div className="lp-arrows">
            <button type="button" className="lp-circle" aria-label="Scroll zones back" onClick={() => scroll(-1)}><ArrowLeft size={18} /></button>
            <button type="button" className="lp-circle" aria-label="Scroll zones forward" onClick={() => scroll(1)}><ArrowRight size={18} /></button>
          </div>
        </div>
        <div className="lp-track" ref={track}>
          {list.length === 0 ? <p className="lp-empty">No zone matches that search. Clear the box or pick another severity.</p> : null}
          {list.map((z) => (
            <article key={z.name} className="lp-card">
              <div className="lp-card-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ZONE_IMG[z.name]} alt="" width={800} height={600} loading="lazy" />
                <span className={`lp-chip ${lvl(z.score)}`}><i aria-hidden="true" />{lvlWord(z.score)}</span>
                <span className="lp-score"><i aria-hidden="true" />{z.score}<small>/100</small></span>
              </div>
              <h3>{z.name}</h3>
              <p>{z.cause}. {z.action}</p>
              <Link href="/" className="lp-card-link">Open in control room <ArrowRight size={16} /></Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

/* ---------- Pilot form ---------- */
function Pilot() {
  const [name, setName] = useState('');
  const send = (e: FormEvent) => {
    e.preventDefault();
    const s = name.trim() || 'our site';
    const body = `We would like to run a Visual HSE pilot at ${s}.\n\nCameras on the floor:\nSensors already installed:\nPermit and lockout system:\nShift pattern:\n`;
    window.location.href = `mailto:?subject=${encodeURIComponent(`Visual HSE pilot: ${s}`)}&body=${encodeURIComponent(body)}`;
  };
  return (
    <section id="pilot" className="lp-pilot" aria-labelledby="pilot-h">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/landing/pilot.jpg" alt="An engineer in a white hard hat and safety glasses reading a tablet on a steel plant floor" width={1600} height={1064} loading="lazy" />
      <span className="lp-hero-shade" aria-hidden="true" />
      <div className="lp-pilot-body" data-rise>
        <h2 id="pilot-h">Run a pilot on your floor</h2>
        <p>Start with the cameras you already have. Tell us about your site and we will plan the pilot around your permits, lockout points and shifts.</p>
        <form onSubmit={send} className="lp-pilot-form">
          <label className="lp-sr" htmlFor="lp-site">Your site name</label>
          <input id="lp-site" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your site name" autoComplete="organization" />
          <button type="submit" className="lp-pill-cta">
            <span className="lp-pill-icon"><ArrowUpRight size={16} /></span>
            Request a pilot
          </button>
        </form>
      </div>
    </section>
  );
}

/* ---------- Page ---------- */
const FEATURES = [
  { icon: Camera, title: 'Vision-AI on your cameras', text: 'Spots a hand in a press, a missing glove or a spill, and stops the machine in 0.6 s when it must.' },
  { icon: Lock, title: 'Permits and lockout', text: 'Holds a permit until the camera sees the power off and the lock on the switch.' },
  { icon: FileText, title: 'Reports drafted for you', text: 'Incidents arrive written, with likely causes, waiting for a person to approve and file.' },
  { icon: ShieldCheck, title: 'Audit-ready evidence', text: 'Every event is mapped to ISO 45001, ISO 14001 and OSHA 1910 clauses as it happens.' },
];

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current!;
    el.classList.add('lp-motion');
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    el.querySelectorAll<HTMLElement>('[data-rise]').forEach((r) => io.observe(r));
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp" ref={root}>
      <div className="lp-page">
        <Nav />
        <Hero />
        <Zones />

        <section id="plant" className="lp-plant" aria-labelledby="plant-h" data-rise>
          <div className="lp-sec-head">
            <div>
              <h2 id="plant-h">Your plant in 3D</h2>
              <p className="lp-sub">Plant A from the live floor plan. Each zone stands as tall as its risk score, and every capsule is a person on the floor.</p>
            </div>
            <Link href="/spatial" className="lp-text-link">Open the full spatial view <ArrowUpRight size={16} /></Link>
          </div>
          <Plant3D />
        </section>

        <section id="product" className="lp-elevate" aria-labelledby="elevate-h">
          <div className="lp-elevate-text" data-rise>
            <h2 id="elevate-h">Software suggests, people decide</h2>
            <p className="lp-sub">Visual HSE is a safety copilot for the factory floor. It filters the noise, does the paperwork, and leaves every call that matters to the people on shift.</p>
            <ul className="lp-features">
              {FEATURES.map((f) => (
                <li key={f.title}>
                  <span className="lp-feat-icon"><f.icon size={16} aria-hidden="true" /></span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
          <figure className="lp-elevate-img" data-rise>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/person-decides.jpg" alt="A safety engineer in a white hard hat and high-visibility vest checking a tablet on site" width={1600} height={1067} loading="lazy" />
            <span className="lp-tag light">INC-0412 · Needs approval</span>
            <span className="lp-tag outline">Approve and file</span>
            <figcaption>
              <b>3</b> alerts reached a person in Shift B. <b>41</b> were held back because a permit, a lockout or the roster explained them.
            </figcaption>
          </figure>
        </section>

        <Pilot />

        <footer className="lp-foot">
          <div className="lp-foot-top">
            <span className="lp-word big">Visual HSE</span>
            <nav aria-label="Product screens">
              <Link href="/">Control room</Link>
              <Link href="/live">Live floor</Link>
              <Link href="/spatial">Spatial view</Link>
              <Link href="/incidents">Incidents</Link>
              <Link href="/compliance">Compliance</Link>
              <Link href="/guide">User guide</Link>
            </nav>
          </div>
          <p className="lp-credits">
            Sample data from the {site.name} pilot. Photos from Pexels:{' '}
            {CREDITS.map(([t, u], k) => (
              <span key={u}>{k ? ', ' : ''}<a href={u} rel="noopener noreferrer" target="_blank">{t}</a></span>
            ))}.
          </p>
        </footer>
      </div>
    </div>
  );
}
