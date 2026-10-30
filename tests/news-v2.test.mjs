import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {sameEvent,canonicalUrl} from '../lib/news/cluster.mjs';
import {reviewQueue} from '../lib/news/rank.mjs';
import {runShadowIngest,runShadowClustering,runShadowCycle,handleAPI} from '../lib/news-service.mjs';
import {comparePair,clusterCandidates} from '../lib/news/matcher.mjs';
import {evaluateClusters} from '../lib/news/evaluate.mjs';

function database(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const name of ['0000_last_the_hand.sql','0001_milky_mariko_yashida.sql','0002_fantastic_korvac.sql'])sqlite.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 const prepare=sql=>{let args=[];const p={bind(...v){args=v;return p;},async first(){return sqlite.prepare(sql).get(...args)??null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return sqlite.prepare(sql).run(...args);}};return p;};
 return {sqlite,prepare,batch:async statements=>{sqlite.exec('BEGIN');try{for(const statement of statements)await statement.run();sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
}
const now=Date.parse('2026-10-18T14:59:30Z');
const sources=[{key:'a',publisher:'매체 A',publisherGroup:'a',type:'direct',url:'https://a.test/rss',domains:['a.test'],maxItems:10},{key:'b',publisher:'매체 B',publisherGroup:'b',type:'direct',url:'https://b.test/rss',domains:['b.test'],maxItems:10},{key:'bad',publisher:'오류',publisherGroup:'bad',type:'direct',url:'https://bad.test/rss',domains:['bad.test'],maxItems:10}];
function rss(host,title='국회 주택 정책 법안 확대 논의'){return `<rss><channel><item><title>${title}</title><link>https://${host}.test/article/1?utm_source=rss</link><description>원문 요약은 저장하지 않습니다</description><pubDate>${new Date(now).toUTCString()}</pubDate></item></channel></rss>`;}
test('source resolution is restricted and event matching is conservative',()=>{
 assert.equal(canonicalUrl('https://a.test/article/1?utm_source=x',['a.test']),'https://a.test/article/1');
 assert.equal(canonicalUrl('https://a.test.evil.test/a',['a.test']),null);
 const a={publisherGroup:'a',title:'삼성전자 실적 발표',publishedAt:new Date(now).toISOString()};
 assert.equal(sameEvent(a,{...a,publisherGroup:'b'}),true);
 assert.equal(sameEvent(a,{...a,publisherGroup:'b',title:'삼성전자 신규 투자 발표'}),false);
});
test('review queue counts publisher groups, never Google discovery entries as evidence',()=>{
 const candidate=(publisherGroup,resolutionStatus='domain_matched')=>({publisherGroup,resolutionStatus});
 const [issue]=reviewQueue([{publishedAt:new Date(now).toISOString(),candidates:[candidate('yonhap'),candidate('yonhap'),candidate('google','metadata_only')]}]);
 assert.equal(issue.publisherCount,1);assert.equal(issue.reviewStatus,'needs_more_sources');
});
test('shadow ingestion preserves every source, clusters cautiously, and is idempotent despite a failed feed',async()=>{
 const db=database();const fetcher=async url=>url.includes('bad.test')?new Response('',{status:503}):new Response(rss(url.includes('a.test')?'a':'b'));
 const first=await runShadowIngest(db,{now,fetcher,sources});assert.deepEqual(first,{sources:3,succeeded:2,candidates:2});
 await runShadowIngest(db,{now:now+1000,fetcher,sources});
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM news_candidates').get().n,2);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM news_issues').get().n,1);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM issue_candidates').get().n,2);
 assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM feed_runs WHERE status='error'").get().n,2);
 assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM news_candidates WHERE description<>''").get().n,0);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM daily').get().n,0);
});
test('internal ingestion fails closed without explicit secret and shadow mode',async()=>{
 const db=database();let calls=0;const fetcher=async()=>{calls++;return new Response('');};
 const request=()=>new Request('https://sai.test/api/internal/ingest',{method:'POST',headers:{Authorization:'Bearer secret'}});
 assert.equal((await handleAPI(request(),{DB:db,NEWS_INGEST_SECRET:'secret'},{fetcher})).status,404);
 assert.equal((await handleAPI(new Request('https://sai.test/api/internal/ingest',{method:'POST'}),{DB:db,NEWS_INGEST_SECRET:'secret',NEWS_ENGINE_V2:'shadow'},{fetcher})).status,404);
 assert.equal(calls,0);
});
test('Google discovery links stay metadata-only and HTML error pages are not successful RSS feeds',async()=>{
 const db=database();const source={key:'google',publisher:'Google News',publisherGroup:'google',type:'discovery',url:'https://news.google.com/rss',domains:['news.google.com'],maxItems:10};
 const xml=rss('news.google.com');
 await runShadowIngest(db,{now,fetcher:async()=>new Response(xml),sources:[source]});
 const row=db.sqlite.prepare('SELECT canonical_url,resolution_status FROM news_candidates').get();
 assert.equal(row.canonical_url,null);assert.equal(row.resolution_status,'metadata_only');
 await assert.rejects(runShadowIngest(db,{now:now+1000,fetcher:async()=>new Response('<html>blocked</html>'),sources:[source]}),e=>e.code==='feed_unavailable');
 assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM feed_runs WHERE status='error'").get().n,1);
});
const candidate=(id,title,offset=0)=>({id,title,publisher:id,publisherGroup:id,publishedAt:new Date(now+offset).toISOString()});
test('structured event matching connects similar reports but rejects explicit actor or action conflicts',()=>{
 const a=candidate('a',"가상자산 업계 '과세 유예' 요청…與 1~2주 안에 결론");
 const b=candidate('b',"가상자산 업계 '과세 유예' 요청…민주당 1~2주 내 결론");
 assert.equal(comparePair(a,b).decision,'confirmed');
 const c=candidate('c','정부, AI 안전성 평가 의무화 발표');
 const d=candidate('d','국회, AI 안전성 평가 의무화 법안 수정');
 assert.equal(comparePair(c,d).decision,'rejected');
 assert.ok(comparePair(c,d).signals.contradictions.includes('different_explicit_actor'));
 const e=candidate('e','AI 기업에 안전성 검증 의무…정부 새 규제 발표');
 assert.equal(comparePair(c,e).decision,'provisional');
});
test('every new member must match the representative and an AI approval cannot force a merge',async()=>{
 const a=candidate('a',"가상자산 업계 과세 유예 요청 與 1~2주 안에 결론");
 const b=candidate('b',"가상자산 업계 과세 유예 요청 민주당 1~2주 내 결론",1000);
 const c=candidate('c',"가상자산 업계 과세 유예 요청 민주당 3~4주 내 결론",2000);
 const result=await clusterCandidates([a,b,c],{adjudicate:async()=> 'confirmed',maxAiCalls:5});
 assert.deepEqual(result.clusters.map(x=>x.members.map(m=>m.id)),[['a','b'],['c']]);
 assert.ok(result.decisions.some(d=>d.candidateId==='c'&&d.decision==='rejected'));
});
test('a strong A–B and B–C match cannot bridge a weak A–C match',async()=>{
 const a=candidate('a','가상자산 업계 과세 유예 요청 민주당 결론 준비 미흡 투자자 보호 조치 보완');
 const b=candidate('b','가상자산 업계 과세 유예 요청 민주당 결론 준비 미흡 시행 연기 조세 체계 금융 시장',1000);
 const c=candidate('c','가상자산 업계 과세 유예 요청 민주당 시행 연기 조세 체계 금융 시장 불확실성 투자',2000);
 assert.equal(comparePair(a,b).decision,'confirmed');assert.equal(comparePair(b,c).decision,'confirmed');assert.equal(comparePair(a,c).decision,'provisional');
 const result=await clusterCandidates([a,b,c]);assert.deepEqual(result.clusters.map(x=>x.members.map(m=>m.id)),[['a','b'],['c']]);
});
test('optional ambiguity review is bounded, sees metadata only, and cannot force confirmation',async()=>{
 const a=candidate('a','정부, AI 안전성 평가 의무화 발표');a.description='DO NOT SEND';
 const b=candidate('b','AI 기업에 안전성 검증 의무…정부 새 규제 발표',1000);b.description='DO NOT SEND';
 let calls=0;const result=await clusterCandidates([a,b],{maxAiCalls:1,adjudicate:async input=>{calls++;assert.equal(JSON.stringify(input).includes('DO NOT SEND'),false);return 'confirmed';}});
 assert.equal(calls,1);assert.equal(result.clusters.length,2);assert.equal(result.decisions[0].decision,'provisional');
});
test('shadow clustering saves versioned decisions while preserving public daily data',async()=>{
 const db=database();const fetcher=async url=>url.includes('bad.test')?new Response('',{status:503}):new Response(rss(url.includes('a.test')?'a':'b'));
 await runShadowIngest(db,{now,fetcher,sources});
 const result=await runShadowClustering(db,{now:now+1000});
 assert.equal(result.candidates,2);assert.equal(result.clusters,1);assert.equal(result.confirmed,1);assert.equal(result.aiCalls,0);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM shadow_cluster_members').get().n,2);
 const decision=db.sqlite.prepare('SELECT decision,signals,matcher_version FROM cluster_decisions').get();
 assert.equal(decision.decision,'confirmed');assert.ok(JSON.parse(decision.signals).titleSimilarity>0);assert.equal(decision.matcher_version,result.matcherVersion);
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM daily').get().n,0);
});
test('clustering is deterministic and evaluation does not invent missing human labels',async()=>{
 const a=candidate('a',"가상자산 업계 과세 유예 요청 與 1~2주 안에 결론");const b=candidate('b',"가상자산 업계 과세 유예 요청 민주당 1~2주 내 결론",1000);const c=candidate('c','교육 예산 확대를 둘러싼 토론',2000);
 const first=await clusterCandidates([a,b,c]),second=await clusterCandidates([c,b,a]);assert.deepEqual(first,second);
 const empty=await evaluateClusters([a,b,c],[{a:'a',b:'b',label:'same',reviewed:false}]);assert.equal(empty.precision,null);assert.equal(empty.recall,null);assert.equal(empty.f1,null);assert.equal(empty.recallAtK,null);
 const synthetic=await evaluateClusters([a,b,c],[{a:'a',b:'b',label:'same',reviewed:true,reviewer:'test fixture'},{a:'a',b:'c',label:'different',reviewed:true,reviewer:'test fixture'}]);assert.equal(synthetic.precision,1);assert.equal(synthetic.recall,1);assert.equal(synthetic.f1,1);
});
test('shadow cycle retains previous results when all feeds fail and never publishes',async()=>{
 const db=database();const good=async url=>url.includes('bad.test')?new Response('',{status:503}):new Response(rss(url.includes('a.test')?'a':'b'));
 const first=await runShadowCycle(db,{now,fetcher:good,sources});assert.equal(first.published,false);assert.equal(first.clustering.candidates,2);
 await assert.rejects(runShadowCycle(db,{now:now+1000,fetcher:async()=>new Response('',{status:503}),sources}),e=>e.code==='feed_unavailable');
 assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM cluster_runs WHERE status='complete'").get().n,1);assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM daily').get().n,0);
});
