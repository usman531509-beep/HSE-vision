import {
  BookOpen, Box, Cctv, ChartColumn, ClipboardCheck, FileLock2, Files, GraduationCap, LayoutDashboard, ListTodo, Mic, ScanEye, ShieldAlert, ShieldCheck, Thermometer, TriangleAlert, type LucideIcon,
} from 'lucide-react';
import type { Tone } from './data';

export interface PageDef { id: string; href: string; nav: string; title: string; icon: LucideIcon; count?: [string, Tone] }

export const PAGES: PageDef[] = [
  { id: 'control', href: '/', nav: 'Overview', title: 'Control room', icon: LayoutDashboard },
  { id: 'live', href: '/live', nav: 'Live floor', title: 'Live floor', icon: Cctv },
  { id: 'camera', href: '/camera', nav: 'Camera analysis', title: 'Camera analysis', icon: ScanEye },
  { id: 'voice', href: '/voice', nav: 'Voice reporting', title: 'Voice reporting', icon: Mic, count: ['2', 'watch'] },
  { id: 'spatial', href: '/spatial', nav: 'Spatial view', title: 'Spatial view', icon: Box },
  { id: 'heat', href: '/heat', nav: 'Heat risk', title: 'Heat risk', icon: Thermometer },
  { id: 'incidents', href: '/incidents', nav: 'Incidents', title: 'Incidents', icon: TriangleAlert, count: ['2', 'act'] },
  { id: 'hira', href: '/hira', nav: 'Hazard & risk', title: 'Hazard ID & risk assessment', icon: ShieldAlert, count: ['1', 'act'] },
  { id: 'permits', href: '/permits', nav: 'Permits & lockout', title: 'Permits & lockout', icon: FileLock2 },
  { id: 'inspections', href: '/inspections', nav: 'Inspections', title: 'Inspections', icon: ClipboardCheck },
  { id: 'actions', href: '/actions', nav: 'Follow-up actions', title: 'Follow-up actions', icon: ListTodo, count: ['7', 'watch'] },
  { id: 'compliance', href: '/compliance', nav: 'Compliance', title: 'Compliance', icon: ShieldCheck },
  { id: 'sop', href: '/sop', nav: 'SOP & documents', title: 'SOP & document control', icon: Files, count: ['5', 'act'] },
  { id: 'training', href: '/training', nav: 'Training', title: 'Training', icon: GraduationCap },
  { id: 'reports', href: '/reports', nav: 'Reports', title: 'Reports', icon: ChartColumn },
  { id: 'guide', href: '/guide', nav: 'User guide', title: 'User guide', icon: BookOpen },
];

/** Pages reached from a module rather than the sidebar; `parent` stays lit in the nav. */
export const SUBPAGES: { id: string; href: string; title: string; parent: string }[] = [
  { id: 'camera-setup', href: '/camera/setup', title: 'Camera setup', parent: 'camera' },
];

/** The page at a path: its id (tour), title, and the nav item to highlight. */
export function pageForPath(pathname: string): { id: string; title: string; nav: string } {
  const sub = SUBPAGES.find((p) => p.href === pathname);
  if (sub) return { id: sub.id, title: sub.title, nav: sub.parent };
  const page = PAGES.find((p) => p.href === pathname) ?? PAGES[0];
  return { id: page.id, title: page.title, nav: page.id };
}
