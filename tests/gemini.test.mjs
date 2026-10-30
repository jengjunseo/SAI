import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGemini,generateGemini,dailyLimit} from '../lib/gemini.mjs';
test('only final Gemini model output is retained, never thought steps',()=>{
 const result=parseGemini({status:'completed',steps:[{type:'thought',signature:'private',summary:[{type:'text',text:'never show'}]},{type:'model_output',content:[{type:'text',text:'{"question":"질문"}'}]}],usage:{total_tokens:120}});
 assert.deepEqual(result,{raw:{question:'질문'},tokens:120});assert.equal(JSON.stringify(result).includes('private'),false);
});
test('truncated, blocked, empty and malformed output cannot replace a saved debate',()=>{
 for(const payload of [{status:'incomplete',steps:[]},{status:'failed',steps:[]},{status:'completed',steps:[]},{status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'broken'}]}]}])assert.throws(()=>parseGemini(payload));
});
test('Gemini quota and key errors trigger exactly one request, without retries or model fallbacks',async()=>{
 for(const [status,code] of [[429,'provider_limit'],[400,'provider_request'],[403,'key_invalid'],[404,'model_unavailable'],[503,'provider_error']]){let calls=0;await assert.rejects(generateGemini({}, {GEMINI_API_KEY:'fake'}, 'test',async()=>{calls++;return new Response('',{status});}),e=>e.code===code);assert.equal(calls,1);}
 assert.equal(dailyLimit({}),50);assert.equal(dailyLimit({MAX_DAILY_AI_CALLS:'5'}),5);assert.equal(dailyLimit({MAX_DAILY_AI_CALLS:'5000'}),500);
});
