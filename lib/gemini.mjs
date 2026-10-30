export const MODEL='gemini-3.5-flash-lite';
export const GEMINI_URL='https://generativelanguage.googleapis.com/v1beta/interactions';
export const dailyLimit=env=>Math.max(1,Math.min(500,Math.floor(Number(env.MAX_DAILY_AI_CALLS)||50)));
const string=description=>({type:'string',description});
export const DEBATE_SCHEMA={type:'object',properties:{
 question:string('쉬운 쟁점 질문, 40자 이내'),context:string('무슨 일이 생겼는지, 140자 이내'),
 leftLabel:string('왼쪽 선택, 8자 이내'),rightLabel:string('오른쪽 선택, 8자 이내'),
 turns:{type:'array',minItems:6,maxItems:6,items:{type:'object',properties:{text:string('본격적인 토론체: 합니다·우려됩니다·그럴 수 있습니까. 쉬운 단어, 2~3문장, 160자 이내'),evidence:{type:'object',properties:{sourceId:string('입력 sources의 id'),paragraphId:string('참고한 사실이 있는 문단 id'),fact:string('해당 문단의 사실을 짧게 바꿔 쓴 요약, 85자 이내')},required:['sourceId','paragraphId','fact']}},required:['text','evidence']}},
 summary:string('공통 목표와 남은 차이, 120자 이내'),uncertainty:string('더 알아볼 질문, 100자 이내')
},required:['question','context','leftLabel','rightLabel','turns','summary','uncertainty']};

export class GeminiError extends Error{constructor(code,message,status=502){super(message);this.code=code;this.status=status;}}

export function parseGemini(payload){
 if(payload.status!=='completed')throw new GeminiError('incomplete_ai_response','대화를 끝까지 정리하지 못했어요. 원문은 계속 읽을 수 있어요.');
 // Thought steps and signatures are never retained or shown to readers.
 const text=(payload.steps||[]).filter(s=>s.type==='model_output').flatMap(s=>s.content||[]).filter(p=>p.type==='text').map(p=>p.text||'').join('');
 if(!text.trim())throw new GeminiError('invalid_ai_response','완성된 대화를 받지 못했어요. 잠시 뒤 다시 확인해주세요.');
 let raw;try{raw=JSON.parse(text);}catch{throw new GeminiError('invalid_ai_response','대화 형식을 확인하지 못했어요. 원문으로 먼저 살펴볼 수 있어요.');}
 return {raw,tokens:Math.max(0,Number(payload.usage?.total_tokens)||0)};
}

export async function generateGemini(article,env,system,fetcher=fetch){
 const model=env.GEMINI_MODEL||MODEL;
 const response=await fetcher(GEMINI_URL,{method:'POST',headers:{'x-goog-api-key':env.GEMINI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({
  model,system_instruction:system,input:JSON.stringify({title:article.title,rssSummary:article.description,source:article.source,publishedAt:article.published_at,sources:article.sources}),
  store:false,stream:false,response_format:{type:'text',mime_type:'application/json',schema:DEBATE_SCHEMA},
  generation_config:{thinking_level:'minimal',max_output_tokens:5200}
 }),signal:AbortSignal.timeout(90000)});
 if(!response.ok){
  let reason='';try{reason=String((await response.json()).error?.message||'').replaceAll(env.GEMINI_API_KEY||'__no_key__','[redacted]').slice(0,350);}catch{}
  console.warn(JSON.stringify({event:'gemini_http_error',status:response.status,model,reason}));
  if(response.status===429)throw new GeminiError('provider_limit','Gemini 사용량이 잠시 많아요. 완성된 대화와 원문은 계속 읽을 수 있어요.',429);
  if([401,403].includes(response.status)||(response.status===400&&/api.key/i.test(reason)))throw new GeminiError('key_invalid','AI 키의 권한을 확인해주세요. 원문은 계속 읽을 수 있어요.',503);
  if(response.status===400)throw new GeminiError('provider_request','AI 요청 형식을 확인하고 있어요. 원문으로 먼저 읽어주세요.',503);
  if(response.status===404)throw new GeminiError('model_unavailable','선택한 AI 모델에 연결하지 못했어요. 연결 설정을 확인해주세요.',503);
  throw new GeminiError('provider_error','대화 연결이 잠시 지연돼요. 원문으로 먼저 살펴볼 수 있어요.');
 }
 const reader=response.body?.getReader();if(!reader)throw new GeminiError('invalid_ai_response','대화 응답이 비어 있어요.');
 let bytes=0,body='';const decoder=new TextDecoder();try{for(;;){const{done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>1500000){await reader.cancel();throw new GeminiError('invalid_ai_response','대화 응답이 너무 커서 확인하지 못했어요.');}body+=decoder.decode(value,{stream:true});}body+=decoder.decode();}finally{reader.releaseLock();}
 let payload;try{payload=JSON.parse(body);}catch{throw new GeminiError('invalid_ai_response','대화 연결을 확인하지 못했어요. 잠시 뒤 다시 시도해주세요.');}
 return {...parseGemini(payload),model};
}
