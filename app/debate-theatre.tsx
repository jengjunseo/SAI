'use client';
import {useEffect,useLayoutEffect,useReducer,useRef,type ReactNode,type CSSProperties} from 'react';
import {ArrowDown,ArrowUpRight,RotateCcw,ShieldCheck} from 'lucide-react';
import {playback,initialPlayback,PREPARE_MS} from '@/lib/playback.mjs';
import {reducedMotion} from '@/lib/motion';
export type Debate={editorialVersion?:number;question:string;context:string;leftLabel:string;rightLabel:string;turns:{side:string;text:string;basis?:string;evidence?:{url:string;title:string;publisher:string;fact:string}}[];summary:string;uncertainty:string};
type State={index:number;phase:string};
function ChatBubble({text,typing,fresh}:{text:string;typing:boolean;fresh:boolean}){
 const ref=useRef<HTMLDivElement>(null),previous=useRef<{width:number;height:number}|null>(null);
 useLayoutEffect(()=>{
  const node=ref.current;if(!node)return;const rect=node.getBoundingClientRect(),before=previous.current;previous.current={width:rect.width,height:rect.height};
  if(!before||typing||reducedMotion())return;
  const a=node.animate([{width:before.width+'px',height:before.height+'px',borderRadius:'23px'},{width:rect.width+'px',height:rect.height+'px',borderRadius:'23px'}],{duration:620,easing:'cubic-bezier(.16,1.18,.3,1)'});return()=>a.cancel();
 },[typing]);
 return <div ref={ref} className={`chat-bubble ${typing?'is-typing':''} ${fresh?'is-fresh':''}`}>
  {typing?<div className="instagram-typing" role="status" aria-label="입력 중"><i/><i/><i/></div>:<p className="chat-text" aria-label={text}>{text.split(/(\s+)/).map((part,i)=><span aria-hidden="true" className="chat-word" key={i} style={{'--word':i} as CSSProperties}>{part}</span>)}</p>}
 </div>;
}
export function DebateTheatre({debate,identity,children}:{debate:Debate;identity:string;children:ReactNode}){
 const storageKey='sai-chat-v2:'+identity;
 const[state,dispatch]=useReducer(playback,initialPlayback,s=>{try{const v=JSON.parse(sessionStorage.getItem(storageKey)||'null');if(v&&Number.isInteger(v.index)&&v.index>=0&&v.index<6&&['preparing','revealed','complete'].includes(v.phase))return v;}catch{}return s;}) as [State,React.Dispatch<{type:string}>];
 const root=useRef<HTMLDivElement>(null),latest=useRef<HTMLElement|null>(null),freshTurns=useRef(new Set<number>()),firstFrame=useRef(true);
 const gesture=useRef<{x:number;y:number;at:number;scroll:number}|null>(null);
 const preparing=state.phase==='preparing',complete=state.phase==='complete',red=state.index%2===0;
 useEffect(()=>{if(preparing)freshTurns.current.add(state.index);},[preparing,state.index]);
 useEffect(()=>{try{sessionStorage.setItem(storageKey,JSON.stringify(state));}catch{}},[state,storageKey]);
 useEffect(()=>{const shell=root.current?.closest<HTMLElement>('.app-shell');if(!shell)return;shell.dataset.team=red?'red':'blue';return()=>{delete shell.dataset.team;};},[red]);
 useEffect(()=>{
  if(state.phase==='leaving')return;
  const el=latest.current,scroller=root.current?.closest<HTMLElement>('.motion-panel-current');if(!el||!scroller)return;
  let growthFrame=0;
  const frame=requestAnimationFrame(()=>{
   const viewport=scroller.getBoundingClientRect();
   if(complete){const summary=root.current?.querySelector('.chat-summary');if(summary)scroller.scrollTo({top:scroller.scrollTop+summary.getBoundingClientRect().top-viewport.top-12,behavior:reducedMotion()?'instant':'smooth'});return;}
   const r=el.getBoundingClientRect(),bottom=viewport.bottom-120,top=firstFrame.current&&state.index===0?0:Math.max(0,scroller.scrollTop+r.bottom-bottom);firstFrame.current=false;if(r.bottom>bottom||r.top<viewport.top||state.index===0)scroller.scrollTo({top,behavior:reducedMotion()?'instant':'smooth'});
  });
  // Keep the source and next action in view while the typing bubble expands.
  const observer=new ResizeObserver(()=>{cancelAnimationFrame(growthFrame);growthFrame=requestAnimationFrame(()=>{if(preparing||complete)return;const overflow=el.getBoundingClientRect().bottom-(scroller.getBoundingClientRect().bottom-120);if(overflow>1)scroller.scrollTop+=overflow;});});observer.observe(el);
  const stop=setTimeout(()=>observer.disconnect(),1000);
  return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(growthFrame);clearTimeout(stop);observer.disconnect();};
 },[state.index,state.phase,preparing,complete]);
 useEffect(()=>{
  if(!['preparing','leaving'].includes(state.phase))return;
  let remaining=preparing?PREPARE_MS:120,start=0,timer:ReturnType<typeof setTimeout>|undefined,running=false;
  const resume=()=>{if(!document.hidden&&!running){running=true;start=performance.now();timer=setTimeout(()=>dispatch({type:preparing?'READY':'LEFT'}),remaining);}};
  const visibility=()=>{if(document.hidden&&running){clearTimeout(timer);running=false;remaining=Math.max(0,remaining-(performance.now()-start));}else resume();};
  resume();document.addEventListener('visibilitychange',visibility);return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);};
 },[state.phase,state.index,preparing]);
 const blocked=(target:EventTarget|null)=>target instanceof Element&&!!target.closest('a,button,input,textarea,details,summary,.chat-bubble');
 const advance=()=>dispatch({type:'NEXT'}),count=complete?6:state.index+1;
 return <div className={`chat-room ${red?'red':'blue'}`} ref={root}>
  <div className="chat-room-heading"><span><i/> LIVE DEBATE <small>AI 토론</small></span><button onClick={()=>{firstFrame.current=true;freshTurns.current.clear();dispatch({type:'REPLAY'});}} aria-label="토론 처음부터 다시 보기"><RotateCcw size={15}/></button></div>
  <h2 className="chat-question">{debate.question}</h2>
  <div className="chat-context"><ShieldCheck size={13}/><span>AI가 재구성한 토론 · 실제 인물의 발언이 아닙니다.</span></div>
  <div className="chat-canvas" tabIndex={0} role="log" aria-live="polite" aria-relevant="additions text" aria-label="토론 채팅. 입력이 끝나면 빈 공간을 터치해 다음 발언을 듣습니다. 위로 스크롤하면 앞선 발언을 볼 수 있습니다."
   onPointerDown={e=>{if(!e.isPrimary||blocked(e.target))return;gesture.current={x:e.clientX,y:e.clientY,at:performance.now(),scroll:window.scrollY};}}
   onPointerCancel={()=>{gesture.current=null;}}
   onPointerUp={e=>{const g=gesture.current;gesture.current=null;if(g&&!blocked(e.target)&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<10&&Math.abs(window.scrollY-g.scroll)<5&&performance.now()-g.at<600&&!window.getSelection()?.toString())advance();}}
   onKeyDown={e=>{if(e.target===e.currentTarget&&['Enter',' '].includes(e.key)){e.preventDefault();advance();}}}>
   <div className="chat-date"><span>하나의 뉴스, 두 개의 입장</span></div>
   {debate.turns.slice(0,count).map((turn,i)=>{const isRed=i%2===0,isCurrent=i===state.index,typing=isCurrent&&preparing,fresh=isCurrent&&freshTurns.current.has(i);
    return <article className={`chat-turn ${isRed?'red':'blue'} ${isCurrent?'is-current':''}`} key={i} ref={isCurrent?node=>{latest.current=node;}:undefined} aria-label={`${isRed?'레드팀':'블루팀'} ${Math.floor(i/2)+1}번째 발언`}>
     <div className="chat-avatar" aria-hidden="true">{isRed?'R':'B'}</div><div className="chat-message">
      <div className="chat-sender"><strong>{isRed?'레드팀':'블루팀'}</strong><span>{isRed?debate.leftLabel:debate.rightLabel}</span></div>
      <ChatBubble text={turn.text} typing={typing} fresh={fresh}/>
      {!typing&&turn.evidence&&<a className={`chat-source ${fresh?'source-arrive':''}`} href={turn.evidence.url} target="_blank" rel="noopener noreferrer"><span><ShieldCheck size={12}/>{turn.evidence.publisher}<ArrowUpRight size={13}/></span><p>{turn.evidence.fact}</p></a>}
      <span className="chat-delivery">{typing?'입력 중':`발언 ${i+1} · AI가 구성한 입장`}</span>
     </div>
    </article>;
   })}
   {!complete&&<button className={`chat-continue ${preparing?'waiting':''}`} onClick={advance} disabled={state.phase!=='revealed'}>{preparing?<><span className="small-typing"><i/><i/><i/></span>{red?'레드팀':'블루팀'} 입력 중</>:<><span>{state.index===5?'두 입장 정리하기':`${red?'블루팀':'레드팀'}의 반론 듣기`}</span><ArrowDown size={17}/></>}</button>}
   {!complete&&<p className="chat-touch-hint">{preparing?'입력 동작이 끝나면 발언이 펼쳐집니다.':'빈 공간을 터치해도 다음 발언으로 이어집니다.'}</p>}
  </div>
  {complete&&<div className="chat-summary">{children}</div>}
  <div className="chat-footer-note"><span>{complete?'6개 발언 완료':`${preparing?state.index:state.index+1} / 6 발언`}</span><span>입력 동작은 참관을 위한 연출입니다.</span></div>
 </div>;
}
