import type { IconName } from '@/components/ui';
import type { Tone } from './data';

export interface PageDef { id: string; href: string; nav: string; title: string; icon: IconName; count?: [string, Tone] }

export const PAGES: PageDef[] = [
  { id: 'control', href: '/', nav: 'Overview', title: 'Control room', icon: 'grid' },
  { id: 'live', href: '/live', nav: 'Live floor', title: 'Live floor', icon: 'eye' },
  { id: 'incidents', href: '/incidents', nav: 'Incidents', title: 'Incidents', icon: 'alert', count: ['2', 'act'] },
  { id: 'permits', href: '/permits', nav: 'Permits & lockout', title: 'Permits & lockout', icon: 'lock' },
  { id: 'inspections', href: '/inspections', nav: 'Inspections', title: 'Inspections', icon: 'checkSq' },
  { id: 'actions', href: '/actions', nav: 'Follow-up actions', title: 'Follow-up actions', icon: 'list', count: ['7', 'watch'] },
  { id: 'compliance', href: '/compliance', nav: 'Compliance', title: 'Compliance', icon: 'shield' },
  { id: 'training', href: '/training', nav: 'Training', title: 'Training', icon: 'cap' },
  { id: 'reports', href: '/reports', nav: 'Reports', title: 'Reports', icon: 'bars' },
];

export function pageForPath(pathname: string): PageDef {
  return PAGES.find((p) => p.href === pathname) ?? PAGES[0];
}
