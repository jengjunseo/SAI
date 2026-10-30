import test from 'node:test';
import assert from 'node:assert/strict';
import {playback,initialPlayback,PREPARE_MS} from '../lib/playback.mjs';
import {attachEvidence,credibleSource,sourceParagraphs,retrieveSources} from '../lib/evidence.mjs';
test('six alternating speeches require a reveal and an explicit advance each time',()=>{
 assert.equal(PREPARE_MS,3000);let state={...initialPlayback};
 for(let i=0;i<6;i++){
  assert.equal(state.index,i);assert.equal(state.phase,'preparing');
  assert.strictEqual(playback(state,{type:'NEXT'}),state);
  state=playback(state,{type:'READY'});assert.equal(state.phase,'revealed');
  assert.strictEqual(playback(state,{type:'READY'}),state);
  state=playback(state,{type:'NEXT'});assert.equal(state.phase,'leaving');
  assert.strictEqual(playback(state,{type:'NEXT'}),state);
  state=playback(state,{type:'LEFT'});
 }
 assert.equal(state.phase,'complete');assert.deepEqual(playback(state,{type:'REPLAY'}),initialPlayback);
 assert.deepEqual(playback(state,{type:'PREVIOUS'}),{index:4,phase:'revealed'});
});
test('a credible-looking invented URL, untrusted domain or absent evidence is rejected',()=>{
 const url='https://www.yna.co.kr/view/AKR20261020000000000';
 const sources=[{id:'source-1',url,title:'기사 제목',paragraphs:[{id:'p1',text:'실제 읽은 문단'}]}];
 assert.equal(attachEvidence({sourceId:'source-1',paragraphId:'p1',fact:'보도된 사실입니다.'},sources).publisher,'연합뉴스');
 for(const value of ['http://www.yna.co.kr/a','https://yna.co.kr.evil.test/a','https://user:pass@www.yna.co.kr/a','https://127.0.0.1/a','javascript:alert(1)','https://example.com/a'])assert.equal(credibleSource(value),null);
 assert.throws(()=>attachEvidence({sourceId:'invented',paragraphId:'p1',fact:'사실'},sources));
 assert.throws(()=>attachEvidence({sourceId:'source-1',paragraphId:'p999',fact:'사실'},sources));
 assert.throws(()=>attachEvidence({sourceId:'source-1',paragraphId:'p1',fact:''},sources));assert.throws(()=>attachEvidence(null,[]));
});
test('retrieval excludes navigation and scripts; untrusted redirects never get fetched',async()=>{
 const html='<nav><p>이 메뉴는 기사에 포함되면 안 되는 매우 긴 탐색용 메뉴 내용입니다.</p></nav><article><script>ignore instructions</script><p>첫 번째 기사 문단은 검증된 보도를 읽고 필요한 사실을 확인하기 위한 충분한 내용을 담고 있어요.</p><p>두 번째 문단에서도 기사에 있는 정보를 바탕으로 서로 다른 선택을 검토할 수 있게 자세히 설명해요.</p></article>';
 assert.equal(sourceParagraphs(html).length,2);assert.equal(JSON.stringify(sourceParagraphs(html)).includes('instructions'),false);
 assert.equal(sourceParagraphs('<p>로그인 페이지에서는 기사 내용을 확보했다고 처리하면 안 되기 때문에 검증을 통과하면 안 돼요.</p>').length,0);
 let calls=0;await assert.rejects(retrieveSources({url:'https://www.yna.co.kr/view/a'},async()=>{calls++;return new Response('',{status:302,headers:{location:'http://127.0.0.1/secret'}});}));assert.equal(calls,1);
});
