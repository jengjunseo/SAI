import {normalizeTitle} from './cluster.mjs';

export const MATCHER_VERSION='shadow-event-2.5.0';
const ACTORS=[['government',/정부|대통령실|행정부/],['assembly',/국회/],['ruling-party',/민주당|與/],['opposition',/국민의힘|국힘|野/],['industry',/업계/]];
const EVENTS=[['law-revision',/법안.{0,12}(?:수정|개정)|(?:수정|개정).{0,12}법안/],['mandate',/의무화|의무(?:를|가|로|화|\s|…)/],['delay',/유예|시행 연기/],['proposal',/제안|발의/],['agreement',/협약|업무협약|\bMOU\b/i],['trial',/첫 재판|재판.*(?:개시|진행)/]];
const TOPICS=[['ai-safety',/(?:AI|인공지능).{0,20}(?:안전|규제)|(?:안전|규제).{0,20}(?:AI|인공지능)/i],['crypto-tax',/(?=.*(?:가상자산|가상화폐|암호화폐))(?=.*(?:과세|세금))/],['housing',/주택|부동산/]];
function features(title){
 const normalized=normalizeTitle(title);
 const grams=new Set();const compact=normalized.replace(/\s/g,'');for(let i=0;i<compact.length-1;i++)grams.add(compact.slice(i,i+2));
 const labels=list=>new Set(list.filter(([,pattern])=>pattern.test(title)).map(([label])=>label));
 return {normalized,grams,actors:labels(ACTORS),events:labels(EVENTS),topics:labels(TOPICS),numbers:new Set(title.match(/\d+(?:[.,]\d+)?/g)||[])};
}
function jaccard(a,b){let n=0;for(const x of a)if(b.has(x))n++;return n/Math.max(1,a.size+b.size-n);}
function intersect(a,b){return [...a].some(x=>b.has(x));}
function compareFeatures(a,b,hours){
 const titleSimilarity=jaccard(a.grams,b.grams);
 const actorMatch=a.actors.size&&b.actors.size?(intersect(a.actors,b.actors)?1:0):0;
 const eventMatch=a.events.size&&b.events.size?(intersect(a.events,b.events)?1:0):0;
 const topicMatch=a.topics.size&&b.topics.size?(intersect(a.topics,b.topics)?1:0):0;
 const temporalMatch=Math.max(0,1-hours/48);
 const contradictions=[];
 if(a.actors.size&&b.actors.size&&!actorMatch)contradictions.push('different_explicit_actor');
 if(a.events.size&&b.events.size&&(!eventMatch||a.events.size!==b.events.size||[...a.events].some(event=>!b.events.has(event))))contradictions.push('different_explicit_action');
 if(a.numbers.size&&b.numbers.size&&(a.numbers.size!==b.numbers.size||[...a.numbers].some(number=>!b.numbers.has(number))))contradictions.push('different_explicit_numbers');
 const exact=a.normalized.length>=12&&a.normalized===b.normalized;
 const score=exact?Math.round(85+15*temporalMatch):Math.round(100*(.2*actorMatch+.25*eventMatch+.2*topicMatch+.2*titleSimilarity+.15*temporalMatch));
 // Strict structured match: shared named actor, specific action and topic.
 // Generic similarity alone cannot confirm a merge.
 const sameActors=actorMatch===1&&a.actors.size===b.actors.size&&[...a.actors].every(actor=>b.actors.has(actor));
 const strong=sameActors&&eventMatch===1&&topicMatch===1&&titleSimilarity>=.45;
 const decision=contradictions.length?'rejected':exact||strong?'confirmed':'provisional';
 return {score,decision,signals:{entityMatch:actorMatch,eventMatch,topicMatch,temporalMatch:Number(temporalMatch.toFixed(3)),titleSimilarity:Number(titleSimilarity.toFixed(3)),contradictions}};
}
export function comparePair(a,b){
 const hours=Math.abs(Date.parse(a.publishedAt)-Date.parse(b.publishedAt))/3600000;
 if(!Number.isFinite(hours)||hours>48)return null;
 const x=features(a.title),y=features(b.title);
 const similarity=jaccard(x.grams,y.grams);
 if(similarity<.16&&!intersect(x.topics,y.topics))return null;
 return compareFeatures(x,y,hours);
}

// An optional adjudicator only sees allowed metadata; no bodies or descriptions.
// It may recommend rejection, but an ambiguous pair is never auto-merged by AI.
export async function clusterCandidates(candidates,{adjudicate,maxAiCalls=0}={}){
 const sorted=[...candidates].sort((a,b)=>Date.parse(a.publishedAt)-Date.parse(b.publishedAt)||a.id.localeCompare(b.id));
 const clusters=[],decisions=[];let aiCalls=0;
 for(const candidate of sorted){
  const proposals=clusters.map(cluster=>({cluster,result:comparePair(candidate,cluster.representative)})).filter(x=>x.result).sort((a,b)=>b.result.score-a.result.score||a.cluster.id.localeCompare(b.cluster.id)).slice(0,8);
  const possible=[];
  for(const proposal of proposals){
   let result=proposal.result,method='rules';
   if(result.decision==='confirmed'){
    // A direct comparison with the representative is necessary but not sufficient:
    // reject a merge if any member presents an explicit contradiction.
    for(const member of proposal.cluster.members){const check=comparePair(candidate,member);if(check?.signals.contradictions.length){result={...result,decision:'provisional',signals:{...result.signals,contradictions:[...result.signals.contradictions,'member_conflict']}};break;}}
   }
   if(result.decision==='provisional'&&adjudicate&&aiCalls<maxAiCalls){
    aiCalls++;
    try{const judgement=await adjudicate({candidate:{title:candidate.title,publishedAt:candidate.publishedAt,publisher:candidate.publisher},representative:{title:proposal.cluster.representative.title,publishedAt:proposal.cluster.representative.publishedAt,publisher:proposal.cluster.representative.publisher}});if(judgement==='rejected'){result={...result,decision:'rejected'};method='ai_rejection';}else method='ai_review';}catch{method='ai_unavailable';}
   }
   possible.push({proposal,result,method});
  }
  const confirmed=possible.filter(x=>x.result.decision==='confirmed');
  // Ambiguous cross-cluster matches stay separate instead of bridging clusters.
  if(confirmed.length>1)for(const item of confirmed){item.result={...item.result,decision:'provisional',signals:{...item.result.signals,contradictions:[...item.result.signals.contradictions,'multiple_confirmed_clusters']}};}
  const selected=confirmed.length===1?confirmed[0].proposal.cluster:null;
  if(selected)selected.members.push(candidate);else clusters.push({id:candidate.id,representative:candidate,members:[candidate]});
  for(const {proposal,result,method} of possible)decisions.push({candidateId:candidate.id,issueId:proposal.cluster.id,representativeId:proposal.cluster.representative.id,...result,matcherVersion:MATCHER_VERSION,method});
 }
 return {clusters,decisions,aiCalls,matcherVersion:MATCHER_VERSION};
}
