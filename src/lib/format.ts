import type { Timestamp } from 'firebase/firestore';

export function timeAgoLabel(ts: Timestamp | null | undefined): string {
  if (!ts) return '';
  const d = ts.toDate();
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (d.getTime() >= startOfToday) return time;
  if (d.getTime() >= startOfToday - dayMs) return `yesterday ${time}`;
  if (d.getTime() >= startOfToday - 6 * dayMs) {
    return `${d.toLocaleDateString([], { weekday: 'short' })} ${time}`;
  }
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export function firstName(name: string | undefined) {
  return (name ?? 'Someone').split(' ')[0];
}
