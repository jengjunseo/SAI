// Explicitly run: node scripts/test-d1-issue.mjs. All articles and AI responses are synthetic.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import {runShadowClustering,handleAPI} from '../lib/news-service.mjs';

const mf=new Miniflare({modules:true,script:'export default {async fetch(){return new Response("ok")}}',d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB');
 for(const name of ['0000_last_the_hand.sql','0001_milky_mariko_yashida.sql','0002_fantastic_korvac.sql','0003_short_mockingbird.sql','0004_last_big_bertha.sql','0005_late_bishop.sql']){
  const sql=await readFile(new URL('../drizzle/'+name,import.meta.url),'utf8');
  for(const statement of sql.split(';').map(x=>x.replace(/--> statement-breakpoint/g,'').trim()).filter(Boolean))await db.prepare(statement).run();
 }
 const now=Date.now(),ids=['aaaaaaaaaaaaaaaaaaaaaaaa','bbbbbbbbbbbbbbbbbbbbbbbb'],urls=['https://news.sbs.co.kr/test-a','https://news.kbs.co.kr/test-b'];
 const paragraphs=['정부는 새로운 정책을 검토한다고 밝혔으며 여러 조건을 함께 논의하고 있다고 설명했습니다.','국회는 정책 논의 과정에서 다양한 의견을 듣고 관련 사항을 확인하겠다고 밝혔습니다.'];
 for(let i=0;i<2;i++){
  await db.prepare("INSERT INTO news_candidates(id,source_key,publisher,publisher_group,discovery_url,canonical_url,title,description,category,published_at,discovered_at,resolution_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,'domain_matched')").bind(ids[i],'fixture'+i,['SBS','KBS'][i],['sbs','kbs'][i],urls[i],urls[i],'정부 새로운 정책 확대를 둘러싼 논란','','정치',new Date(now+i*1000).toISOString(),now).run();
  await db.prepare('INSERT INTO evidence_grants(candidate_id,url,allow_fetch,allow_ai,allow_display,independent,rights_basis,independence_basis) VALUES(?,?,1,1,1,1,?,?)').bind(ids[i],urls[i],'synthetic fixture','synthetic fixture').run();
 }
 const run=await runShadowClustering(db,{now});assert.equal(run.clusters,1);
 const payload=raw=>Response.json({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(raw)}]}],usage:{total_tokens:5}});
 let calls=0;const fetcher=async(url,init)=>{
  if(init?.method==='POST'){calls++;const body=JSON.parse(init.body);if(body.response_format.schema.properties.verdicts)return payload({overall:'supported',verdicts:Array.from({length:6},(_,index)=>({index,status:'supported'}))});
   return payload({suitable:true,question:'정책을 어떻게 다룰까요?',context:'정책 논의가 진행 중입니다.',leftLabel:'접근 A',rightLabel:'접근 B',summary:'두 접근을 비교합니다.',uncertainty:'무엇을 확인할까요?',turns:Array.from({length:6},(_,i)=>({text:'조건을 살펴야 합니다.',evidence:{sourceId:'source-'+(i%2+1),paragraphId:'p1',fact:paragraphs[i%2]}}))});}
  const i=urls.indexOf(String(url));if(i<0)throw Error('unexpected URL');return new Response(`<article><p>${paragraphs[i]}</p><p>관계 기관은 추가 논의를 이어가고 필요한 조건을 검토하겠다는 입장을 설명했습니다.</p></article>`,{headers:{'content-type':'text/html'}});
 };
 const env={DB:db,NEWS_ENGINE_V2:'shadow',NEWS_INGEST_SECRET:'test-secret',GEMINI_API_KEY:'test-key'};const path=`https://sai.test/api/internal/issues/${run.runId}/${ids[0]}/debate`;
 const request=method=>new Request(path,{method,headers:{Authorization:'Bearer test-secret'}});
 const generated=await handleAPI(request('POST'),env,{now,fetcher});assert.equal(generated.status,200);assert.equal((await generated.json()).debate.turns.length,6);
 const read=await handleAPI(request('GET'),env,{now});assert.equal(read.status,200);assert.equal((await read.json()).article.debate.turns.length,6);assert.equal(calls,2);
 console.log('PASS: real Miniflare D1; synthetic sources and mocked Gemini; cluster → generate → verify → save → read');
}finally{await mf.dispose();}
