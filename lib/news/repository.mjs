import {sameEvent} from './cluster.mjs';
import {hash} from './ingest.mjs';

export async function saveShadowRun(db,runs,now){
 const prior=await db.prepare('SELECT c.*,ic.issue_id FROM news_candidates c JOIN issue_candidates ic ON ic.candidate_id=c.id WHERE c.discovered_at>=?').bind(now-48*3600000).all();
 const known=prior.results.map(r=>({id:r.id,issueId:r.issue_id,title:r.title,publisherGroup:r.publisher_group,publishedAt:r.published_at}));
 let statements=[];
 const flush=async()=>{if(statements.length){await db.batch(statements);statements=[];}};
 for(const run of runs){
  statements.push(db.prepare('INSERT INTO feed_runs(id,source_key,started_at,finished_at,status,candidates_count,error_code) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),run.sourceKey,now,Date.now(),run.status,run.candidates.length,run.errorCode||null));
  for(const c of run.candidates){
   if(statements.length>72)await flush();
   let match=known.find(k=>k.id===c.id)||known.find(k=>sameEvent(k,c));
   const issueId=match?.issueId||await hash('issue:'+c.id);
   statements.push(db.prepare('INSERT INTO news_candidates(id,source_key,publisher,publisher_group,discovery_url,canonical_url,title,description,category,published_at,discovered_at,resolution_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,published_at=excluded.published_at,discovered_at=excluded.discovered_at,resolution_status=excluded.resolution_status').bind(c.id,c.sourceKey,c.publisher,c.publisherGroup,c.discoveryUrl,c.canonicalUrl,c.title,c.description,c.category,c.publishedAt,c.discoveredAt,c.resolutionStatus));
   statements.push(db.prepare("INSERT INTO news_issues(id,headline,category,status,rank_score,created_at,updated_at) VALUES(?,?,?,'discovered',0,?,?) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at").bind(issueId,c.title,c.category,now,now));
   statements.push(db.prepare('INSERT INTO issue_candidates(issue_id,candidate_id,match_score) VALUES(?,?,?) ON CONFLICT(issue_id,candidate_id) DO NOTHING').bind(issueId,c.id,match?100:0));
   if(!match)known.push({id:c.id,issueId,title:c.title,publisherGroup:c.publisherGroup,publishedAt:c.publishedAt});
   else if(!known.some(k=>k.id===c.id))known.push({id:c.id,issueId,title:c.title,publisherGroup:c.publisherGroup,publishedAt:c.publishedAt});
  }
 }
 // Each candidate and its association are written together in one D1 transaction.
 await flush();
 return {sources:runs.length,succeeded:runs.filter(r=>r.status==='ok').length,candidates:runs.reduce((n,r)=>n+r.candidates.length,0)};
}
