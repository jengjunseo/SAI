import {clusterCandidates,MATCHER_VERSION} from './matcher.mjs';

export async function runClustering(db,{now=Date.now(),adjudicate,maxAiCalls=0}={}){
 const runId=crypto.randomUUID();
 await db.prepare("INSERT INTO cluster_runs(id,matcher_version,started_at,status,candidate_count) VALUES(?,?,?,'running',0)").bind(runId,MATCHER_VERSION,now).run();
 try{
  const rows=await db.prepare('SELECT id,title,publisher,publisher_group,published_at FROM news_candidates ORDER BY published_at,id').all();
  const candidates=rows.results.map(r=>({id:r.id,title:r.title,publisher:r.publisher,publisherGroup:r.publisher_group,publishedAt:r.published_at}));
  const result=await clusterCandidates(candidates,{adjudicate,maxAiCalls});
  let batch=[];const flush=async()=>{if(batch.length){await db.batch(batch);batch=[];}};
  for(const cluster of result.clusters)for(const member of cluster.members){
   batch.push(db.prepare('INSERT INTO shadow_cluster_members(run_id,candidate_id,issue_id,representative_id) VALUES(?,?,?,?)').bind(runId,member.id,cluster.id,cluster.representative.id));
   if(batch.length>=75)await flush();
  }
  for(const decision of result.decisions){
   batch.push(db.prepare('INSERT INTO cluster_decisions(run_id,candidate_id,issue_id,representative_id,score,decision,signals,matcher_version,method) VALUES(?,?,?,?,?,?,?,?,?)').bind(runId,decision.candidateId,decision.issueId,decision.representativeId,decision.score,decision.decision,JSON.stringify(decision.signals),decision.matcherVersion,decision.method));
   if(batch.length>=75)await flush();
  }
  await flush();
  await db.prepare("UPDATE cluster_runs SET status='complete',completed_at=?,candidate_count=? WHERE id=?").bind(Date.now(),candidates.length,runId).run();
  return {runId,matcherVersion:MATCHER_VERSION,candidates:candidates.length,clusters:result.clusters.length,confirmed:result.decisions.filter(d=>d.decision==='confirmed').length,provisional:result.decisions.filter(d=>d.decision==='provisional').length,rejected:result.decisions.filter(d=>d.decision==='rejected').length,aiCalls:result.aiCalls};
 }catch(error){await db.prepare("UPDATE cluster_runs SET status='failed',completed_at=? WHERE id=?").bind(Date.now(),runId).run();throw error;}
}
