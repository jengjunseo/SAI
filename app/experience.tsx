'use client';
import {useEffect,useLayoutEffect,useRef,useState,type ReactNode,type PointerEvent} from 'react';
import {reducedMotion} from '@/lib/motion';

/** The selected surface travels to the next choice instead of blinking in place. */
export function SlidingRail({active,selector,className,role,label,children}:{active:string;selector:string;className:string;role:'group'|'tablist'|'navigation';label:string;children:ReactNode}){
 const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const root=ref.current;if(!root)return;
  const update=()=>{const target=root.querySelector<HTMLElement>(selector);if(!target)return;root.style.setProperty('--selection-x',target.offsetLeft+'px');root.style.setProperty('--selection-y',target.offsetTop+'px');root.style.setProperty('--selection-width',target.offsetWidth+'px');root.style.setProperty('--selection-height',target.offsetHeight+'px');root.dataset.ready='true';};
  update();const observer=new ResizeObserver(update);observer.observe(root);for(const child of root.children)if(child.tagName==='BUTTON')observer.observe(child);return()=>observer.disconnect();
 },[active,selector]);
 return <div ref={ref} className={`${className} sliding-rail`} role={role} aria-label={label}><span className="selection-indicator" aria-hidden="true"/>{children}</div>;
}

export function ReadingProgress({articleId}:{articleId:string}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let frame=0;const update=()=>{frame=0;const main=document.querySelector('main');if(!main||!ref.current)return;const length=Math.max(1,main.getBoundingClientRect().height-window.innerHeight+80);ref.current.style.transform=`scaleX(${Math.max(0,Math.min(1,window.scrollY/length))})`;};
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const observer=new ResizeObserver(schedule);const main=document.querySelector('main');if(main)observer.observe(main);window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);update();return()=>{window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);observer.disconnect();cancelAnimationFrame(frame);};
 },[articleId]);
 return <div className="reading-progress" aria-hidden="true"><div ref={ref}/></div>;
}

export function GenerationStatus(){
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{const start=Date.now();const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)),1000);return()=>clearInterval(timer);},[]);
 return <div className="generation-status" role="status"><span className="thinking-dots" aria-hidden="true"><i/><i/><i/></span><strong>{elapsed<20?'두 생각을 쉽게 정리하고 있어요.':'조금 더 시간이 걸리고 있어요.'}</strong><p>원문을 먼저 읽어도 괜찮아요.<br/>완성되면 이 기사에 대화가 나타나요.</p><span className="elapsed" aria-hidden="true">{elapsed}초 기다렸어요</span></div>;
}

export function useSheetDrag(dialog:React.RefObject<HTMLDialogElement|null>,dismiss:()=>void){
 const drag=useRef<{id:number;y:number;started:number;distance:number}|null>(null);
 const settle=()=>{const el=dialog.current;if(!el)return;const transform=el.style.transform||'translateY(0)';el.style.transform='';delete el.dataset.dragging;if(!reducedMotion())el.animate([{transform},{transform:'translateY(0)'}],{duration:350,easing:'cubic-bezier(.16,1,.3,1)'});};
 return {
  onPointerDown:(e:PointerEvent<HTMLDivElement>)=>{if(!e.isPrimary||e.button!==0)return;const el=dialog.current;if(!el)return;drag.current={id:e.pointerId,y:e.clientY,started:Date.now(),distance:0};e.currentTarget.setPointerCapture(e.pointerId);el.dataset.dragging='true';},
  onPointerMove:(e:PointerEvent<HTMLDivElement>)=>{const d=drag.current,el=dialog.current;if(!d||d.id!==e.pointerId||!el)return;d.distance=Math.max(0,e.clientY-d.y);el.style.transform=`translateY(${d.distance*.8}px)`;},
  onPointerUp:(e:PointerEvent<HTMLDivElement>)=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;drag.current=null;if(d.distance>95||(d.distance>35&&d.distance/Math.max(1,Date.now()-d.started)>.5))dismiss();else settle();},
  onPointerCancel:()=>{drag.current=null;settle();}
 };
}
