import test from 'node:test';
import assert from 'node:assert/strict';
import {debateEventStream} from '../lib/completion-stream.mjs';
test('app SSE begins immediately, then returns saved result',async()=>{let resolve;const work=new Promise(r=>resolve=r);const response=debateEventStream(()=>work),reader=response.body.getReader();const first=new TextDecoder().decode((await reader.read()).value);assert.match(first,/event: progress/);resolve({debate:{question:'질문'},cached:false});let text='';for(;;){const{done,value}=await reader.read();if(done)break;text+=new TextDecoder().decode(value);}assert.match(text,/event: result/);assert.match(text,/질문/);});
test('app SSE returns structured provider errors without HTML',async()=>{const response=debateEventStream(()=>{const e=new Error('로그인이 필요해요.');e.code='sign_in';throw e;});const text=await response.text();assert.match(text,/event: error/);assert.match(text,/sign_in/);assert.equal(text.includes('<!DOCTYPE'),false);});
