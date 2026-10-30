import {credibleSource,retrieveSources} from '../evidence.mjs';

export class EvidenceError extends Error{constructor(code,message){super(message);this.code=code;}}

// The grant is an explicit per-URL attestation, not an inference from RSS access.
export async function issueSources(db,runId,issueId,{fetcher=fetch,now=Date.now()}={}){
 const result=await db.prepare(`SELECT c.*,g.url AS granted_url,g.allow_fetch,g.allow_ai,g.allow_display,g.independent,g.rights_basis,g.independence_basis,g.expires_at
  FROM shadow_cluster_members m JOIN cluster_runs r ON r.id=m.run_id AND r.status='complete'
  JOIN news_candidates c ON c.id=m.candidate_id LEFT JOIN evidence_grants g ON g.candidate_id=c.id
  WHERE m.run_id=? AND m.issue_id=? ORDER BY c.published_at,c.id`).bind(runId,issueId).all();
 if(!result.results.length)throw new EvidenceError('issue_not_found','이슈를 찾지 못했어요.');
 const eligible=result.results.filter(c=>c.resolution_status==='domain_matched'&&c.canonical_url&&c.canonical_url===c.granted_url&&credibleSource(c.canonical_url)&&c.allow_fetch===1&&c.allow_ai===1&&c.allow_display===1&&c.independent===1&&c.rights_basis?.trim()&&c.independence_basis?.trim()&&(!c.expires_at||c.expires_at>now));
 const chosen=[];for(const row of eligible)if(!chosen.some(x=>x.publisher_group===row.publisher_group))chosen.push(row);
 if(chosen.length<2)throw new EvidenceError('insufficient_permissions','독립 출처의 원문·AI 이용 허가가 두 건 이상 확인되지 않았어요.');
 const sources=[];
 for(const row of chosen.slice(0,4)){
  try{
   const original=new URL(row.canonical_url);const scopedFetcher=(url,init)=>{const u=new URL(url);if(u.href!==original.href||u.protocol!=='https:')throw new Error('redirect_outside_grant');return fetcher(url,init);};
   const [source]=await retrieveSources({url:row.canonical_url,title:row.title},scopedFetcher);
   if(source.url!==row.canonical_url)continue; // A grant for one URL does not grant a redirect target.
   if(source.paragraphs.some(p=>/연합뉴스|뉴시스|뉴스1|Reuters|Associated Press|무단 전재|AI 학습 및 활용 금지/i.test(p.text)))continue;
   sources.push({...source,id:'source-'+(sources.length+1),candidateId:row.id,publisherGroup:row.publisher_group});
  }catch{/* unavailable sources do not silently become evidence */}
 }
 if(sources.length<2)throw new EvidenceError('insufficient_evidence','허가된 독립 원문 두 건을 확보하지 못했어요.');
 // Near-identical text can indicate syndicated reporting even across publishers.
 const grams=s=>{const text=s.paragraphs.map(p=>p.text.replace(/\s+/g,'')).join('').slice(0,800);return new Set(Array.from({length:Math.max(0,text.length-3)},(_,i)=>text.slice(i,i+4)));};
 for(let i=0;i<sources.length;i++)for(let j=i+1;j<sources.length;j++){const a=grams(sources[i]),b=grams(sources[j]);let common=0;for(const item of a)if(b.has(item))common++;if(common/Math.max(1,Math.min(a.size,b.size))>=.8)throw new EvidenceError('syndicated_evidence','유사한 원문이 반복되어 독립 근거로 쓸 수 없어요.');}
 return sources;
}

export function checkExtractiveAnchors(raw,sources){
 if(!Array.isArray(raw?.turns)||raw.turns.length!==6)throw new EvidenceError('invalid_evidence','여섯 발언을 확인하지 못했어요.');
 const used=new Set();
 for(const turn of raw.turns){
  const ev=turn?.evidence,source=sources.find(s=>s.id===ev?.sourceId),paragraph=source?.paragraphs.find(p=>p.id===ev?.paragraphId);
  if(!paragraph||typeof ev.fact!=='string'||!ev.fact.trim()||!paragraph.text.includes(ev.fact.trim()))throw new EvidenceError('unsupported_evidence','근거 요약을 원문 문단에서 정확히 확인하지 못했어요.');
  const numbers=String(turn.text||'').match(/\d+(?:[.,]\d+)?/g)||[];const actual=new Set(paragraph.text.match(/\d+(?:[.,]\d+)?/g)||[]);if(numbers.some(n=>!actual.has(n)))throw new EvidenceError('unsupported_evidence','발언의 숫자를 근거 문단에서 확인하지 못했어요.');
  used.add(source.id);
 }
 if(used.size<2)throw new EvidenceError('insufficient_evidence','두 독립 출처가 발언에 사용되지 않았어요.');
}
