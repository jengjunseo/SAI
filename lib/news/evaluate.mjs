import {clusterCandidates} from './matcher.mjs';

// Labels must come from independent review. Unreviewed examples are excluded.
export async function evaluateClusters(candidates,labels,{k=8}={}){
 const result=await clusterCandidates(candidates);const valid=(labels||[]).filter(x=>x.reviewed===true&&typeof x.reviewer==='string'&&x.reviewer.trim()&&['same','different'].includes(x.label));
 const membership=new Map();for(const cluster of result.clusters)for(const c of cluster.members)membership.set(c.id,cluster.id);
 let tp=0,fp=0,fn=0,positive=0,retrieved=0,provisionalSame=0,provisionalDifferent=0,unobserved=0;
 for(const label of valid){
  if(!membership.has(label.a)||!membership.has(label.b))throw Error('Label references a missing candidate');
  const merged=membership.get(label.a)===membership.get(label.b);
  const decision=result.decisions.find(d=>(d.candidateId===label.a&&d.representativeId===label.b)||(d.candidateId===label.b&&d.representativeId===label.a));
  if(label.label==='same'){positive++;if(merged)tp++;else fn++;}else if(merged)fp++;
  if(decision?.decision==='provisional'){if(label.label==='same')provisionalSame++;else provisionalDifferent++;}
  if(!decision)unobserved++;
  // Retrieval@K is limited to representative comparisons the matcher actually retained.
  const candidate=decision?.candidateId;
  if(label.label==='same'&&candidate){const ranked=result.decisions.filter(d=>d.candidateId===candidate).sort((a,b)=>b.score-a.score||a.issueId.localeCompare(b.issueId));if(ranked.slice(0,Math.min(k,8)).includes(decision))retrieved++;}
 }
 const precision=tp+fp?tp/(tp+fp):null,recall=positive?tp/positive:null;
 return {matcherVersion:result.matcherVersion,labels:valid.length,counts:{tp,fp,fn,positive,provisionalSame,provisionalDifferent,unobserved},precision,recall,f1:precision!==null&&recall!==null?(precision+recall?2*precision*recall/(precision+recall):0):null,recallAtK:positive?retrieved/positive:null,k:Math.min(k,8),note:'Recall@K covers retained representative comparisons only; non-representative pairs count as misses. Empty denominators and missing reviewed labels are null.'};
}
