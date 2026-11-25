import {
  Box, Cctv, ChartColumn, ClipboardCheck, FileLock2, GraduationCap, LayoutDashboard, ListTodo, ShieldCheck, TriangleAlert, type LucideIcon,
} from 'lucide-react';
import type { Tone } from './data';

export interface PageDef { id: string; href: string; nav: string; title: string; icon: LucideIcon; count?: [string, Tone] }

export const PAGES: PageDef[] = [
  { id: 'control', href: '/', nav: 'Overview', title: 'Control room', icon: LayoutDashboard },
  { id: 'live', href: '/live', nav: 'Live floor', title: 'Live floor', icon: Cctv },
  { id: 'spatial', href: '/spatial', nav: 'Spatial view', title: 'Spatial view', icon: Box },
  { id: 'incidents', href: '/incidents', nav: 'Incidents', title: 'Incidents', icon: TriangleAlert, count: ['2', 'act'] },
  { id: 'permits', href: '/permits', nav: 'Permits & lockout', title: 'Permits & lockout', icon: FileLock2 },
  { id: 'inspections', href: '/inspections', nav: 'Inspections', title: 'Inspections', icon: ClipboardCheck },
  { id: 'actions', href: '/actions', nav: 'Follow-up actions', title: 'Follow-up actions', icon: ListTodo, count: ['7', 'watch'] },
  { id: 'compliance', href: '/compliance', nav: 'Compliance', title: 'Compliance', icon: ShieldCheck },
  { id: 'training', href: '/training', nav: 'Training', title: 'Training', icon: GraduationCap },
  { id: 'reports', href: '/reports', nav: 'Reports', title: 'Reports', icon: ChartColumn },
];

export function pageForPath(pathname: string): PageDef {
  return PAGES.find((p) => p.href === pathname) ?? PAGES[0];
}
