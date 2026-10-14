import type { Note } from './content';
import type { Talk } from './talk';

const ORDER = ['冠军形势','周末前瞻','近期状态','新涂装','涂装故事','车手装备','特别头盔','头盔故事','场外动态','场外故事','人物关系','队内关系','职业动向','技术变化','策略看点','轮胎策略','策略复盘','驾驶看点','最近一次','故事线','下一站','现役','历史回声','里程碑','纪录','数字','冷知识','赛前档案'];
const order = (tag: string) => { const i = ORDER.indexOf(tag); return i < 0 ? ORDER.length : i; };
function similar(a: string, b: string) {
  const grams = (t: string) => { const g = new Set<string>(), x = t.replace(/\s|[，。、：；·（）()]/g, ''); for (let i=0;i<x.length-1;i++) g.add(x.slice(i,i+2)); return g; };
  const A = grams(a), B = grams(b);
  let common = 0; for (const g of A) if (B.has(g)) common++;
  return common / Math.max(1, Math.min(A.size,B.size));
}
function covered(a: Talk, n: Note) {
  if (a.topic || n.topic) return !!a.topic && a.topic === n.topic;
  if (n.dimension && a.dimension && n.dimension !== a.dimension) return false;
  const hay = n.title+n.text;
  if (similar(hay,a.title)>=.5) return true;
  const surname = a.title.match(/·([\u4e00-\u9fa5]{2,4})/)?.[1];
  if (surname && a.tag===n.tag && n.title.includes(surname)) return true;
  const nums=(a.title.match(/\d+(\.\d+)?/g)??[]).filter(x=>+x>=10);
  const sameTopic=/排位|队友|队内/.test(a.title)?/排位|队友|队内/.test(hay):true;
  return nums.length>0 && nums.every(x=>hay.includes(x)) && sameTopic && similar(hay,a.title)>=.15;
}
export type CommentaryItem = (Note & {curated:true}) | (Talk & {curated:false});
/** Keep each editorial fact once across race, circuit, driver and season sections of a brief. */
export function partitionNotes(groups: Note[][]): Note[][] {
  const seen = new Set<string>();
  return groups.map(group => group.filter(n => {
    const key = n.topic ?? `${n.title}:${n.text}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }));
}
export function mergeTalkingPoints(notes: Note[], auto: Talk[]): CommentaryItem[] {
  const unique = [...new Map(notes.map(n=>[n.topic ?? `${n.title}:${n.text}`,n])).values()];
  const items: CommentaryItem[] = [...unique.map(n=>({...n,curated:true as const})),...auto.filter(a=>!unique.some(n=>covered(a,n))).map(a=>({...a,curated:false as const}))];
  const seen = new Set<string>();
  return items.filter(i=>{if(!i.topic)return true; if(seen.has(i.topic))return false; seen.add(i.topic); return true;})
    .sort((a,b)=>order(a.tag)-order(b.tag) || ('eventDate' in b ? b.eventDate ?? b.publishedAt ?? '' : '').localeCompare('eventDate' in a ? a.eventDate ?? a.publishedAt ?? '' : ''));
}
export function noteDate(n: Partial<Note>): string {
  const short = (d: string) => d.split("T")[0];
  return [n.eventDate && `事件 ${short(n.eventDate)}`,n.publishedAt && `发布 ${short(n.publishedAt)}`,n.verifiedAt && `核实 ${short(n.verifiedAt)}`,n.asOfRace && `截至 ${n.asOfRace.year} 第 ${n.asOfRace.round} 站`,n.status==='statement' && '公开表态',n.status==='analysis' && '观察'].filter(Boolean).join(' · ');
}
export function commentaryText(notes: Note[], auto: Talk[]): string {
  return mergeTalkingPoints(notes,auto).map(i=>{
    const sources = i.curated ? i.sources.map(s=>`${s.label} ${s.url}`).join('；') : `${i.source ?? 'F1DB'} https://github.com/f1db/f1db${i.href ? ` · ${i.href}` : ''}`;
    return `【${i.tag}】${i.title}：${i.text}\n${noteDate(i)}${sources ? `\n来源：${sources}` : ''}`;
  }).join('\n\n');
}
