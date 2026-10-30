export async function requestDebate<T>(id:string,rewrite=false):Promise<T>{
 const response=await fetch(`/api/articles/${id}/debate${rewrite?'?rewrite=1':''}`,{method:'POST',headers:{Accept:'text/event-stream'}});
 const contentType=response.headers.get('content-type')||'';
 if(!contentType.includes('text/event-stream')){
  if(!contentType.includes('application/json')){const e=new Error(response.status===401||response.url.includes('signin')||response.url.includes('auth.openai.com')?'로그인 후 다시 이어서 볼 수 있어요.':'서버 연결이 중간에 끊겼어요. 잠시 뒤 다시 확인해주세요.') as Error&{code?:string};if(response.status===401||response.url.includes('signin')||response.url.includes('auth.openai.com'))e.code='sign_in';throw e;}
  const data=await response.json() as {message?:string;error?:string};if(!response.ok){const e=new Error(data.message||'연결을 확인해주세요.') as Error&{code?:string};e.code=data.error;throw e;}return data as T;
 }
 if(!response.body)throw new Error('생성 연결이 비어 있어요. 다시 시도해주세요.');
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',total=0,result:T|undefined;
 try{for(;;){const{done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>200000)throw new Error('응답이 너무 커서 읽지 못했어요.');buffer+=decoder.decode(value,{stream:true}).replace(/\r\n/g,'\n');let end;while((end=buffer.indexOf('\n\n'))!==-1){const event=buffer.slice(0,end);buffer=buffer.slice(end+2);const kind=event.match(/^event:\s*(\w+)/m)?.[1];const data=event.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('\n');if(!data)continue;if(kind==='result')result=JSON.parse(data) as T;if(kind==='error'){const parsed=JSON.parse(data) as {message:string;error:string};const e=new Error(parsed.message) as Error&{code?:string};e.code=parsed.error;throw e;}}}}finally{reader.releaseLock();}
 if(!result)throw new Error('연결이 끝나기 전에 결과를 받지 못했어요. 잠시 뒤 다시 확인해주세요.');return result;
}
