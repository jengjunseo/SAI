export function debateEventStream(work){
 const encoder=new TextEncoder();let timer,closed=false;
 const body=new ReadableStream({
  start(controller){
   const emit=(event,data)=>{if(!closed)controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));};
   emit('progress',{stage:'generating'});
   timer=setInterval(()=>{if(!closed)controller.enqueue(encoder.encode(': heartbeat\n\n'));},5000);
   void Promise.resolve().then(work).then(result=>emit('result',result),error=>emit('error',{error:error.code||'provider_error',message:error.code?error.message:'토론 생성 연결이 원활하지 않아요. 잠시 뒤 다시 확인해주세요.'})).finally(()=>{clearInterval(timer);if(!closed){closed=true;controller.close();}});
  },
  cancel(){closed=true;clearInterval(timer);},
 });
 return new Response(body,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'}});
}
