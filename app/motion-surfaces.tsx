'use client';
import {useLayoutEffect,useRef,type ReactNode} from 'react';
import {reducedMotion} from '@/lib/motion';
function inertSnapshot(element:HTMLElement){const clone=element.cloneNode(true) as HTMLElement;clone.inert=true;clone.setAttribute('aria-hidden','true');clone.removeAttribute('id');clone.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));clone.querySelectorAll('.motion-list-ghost,.motion-panel-ghost').forEach(e=>e.remove());clone.querySelectorAll<HTMLElement>('[style]').forEach(e=>{e.style.viewTransitionName='none';});return clone;}

/** Keep navigation live while the old and new content move beside one another. */
export function SlidingPanel({active,order,children}:{active:string;order:string[];children:ReactNode}){
 const root=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null),previous=useRef<{active:string;height:number;snapshot:HTMLElement;scrollTop:number}|null>(null),cancel=useRef<()=>void>(()=>{});
 useLayoutEffect(()=>{
  const el=root.current,node=content.current;if(!el||!node)return;
  const prior=previous.current,height=node.getBoundingClientRect().height;previous.current={active,height,snapshot:inertSnapshot(node),scrollTop:node.scrollTop};
  if(!prior||prior.active===active)return;
  cancel.current();node.scrollTop=0;if(reducedMotion())return;
  const direction=order.indexOf(active)>=order.indexOf(prior.active)?1:-1,ghost=prior.snapshot;ghost.className='motion-panel-ghost';el.appendChild(ghost);ghost.scrollTop=prior.scrollTop;node.scrollTop=0;el.dataset.moving='true';
  const options={duration:560,easing:'cubic-bezier(.18,1,.3,1)',fill:'both' as FillMode};
  const enter=node.animate([{transform:`translateX(${direction*96}%)`,opacity:.45},{transform:'translateX(0)',opacity:1}],options);
  const leave=ghost.animate([{transform:'translateX(0)',opacity:1},{transform:`translateX(${-direction*42}%)`,opacity:0}],{...options,duration:440});
  const size=el.animate([{height:prior.height+'px'},{height:height+'px'}],options);
  let cleared=false;const clear=()=>{if(cleared)return;cleared=true;enter.cancel();leave.cancel();size.cancel();ghost.remove();delete el.dataset.moving;};
  cancel.current=clear;void Promise.all([enter.finished,leave.finished,size.finished]).then(clear).catch(()=>{});
 });
 useLayoutEffect(()=>{const node=content.current;if(!node)return;const observer=new MutationObserver(()=>{if(previous.current?.active===active)previous.current={active,height:node.getBoundingClientRect().height,snapshot:inertSnapshot(node),scrollTop:node.scrollTop};});const scroll=()=>{if(previous.current?.active===active)previous.current.scrollTop=node.scrollTop;};node.addEventListener('scroll',scroll,{passive:true});observer.observe(node,{childList:true,subtree:true,characterData:true});return()=>{observer.disconnect();node.removeEventListener('scroll',scroll);};},[active]);
 useLayoutEffect(()=>()=>cancel.current(),[]);
 return <div className="motion-panel" ref={root}><div className="motion-panel-current" ref={content}>{children}</div></div>;
}

/** Move retained rows to their new positions, with separate entry and exit motion. */
export function AnimatedList({children,className=''}:{children:ReactNode;className?:string}){
 const root=useRef<HTMLDivElement>(null),previous=useRef(new Map<string,{top:number;height:number;snapshot:HTMLElement}>()),animations=useRef<Animation[]>([]),ghosts=useRef<HTMLElement[]>([]);
 useLayoutEffect(()=>{
  const el=root.current;if(!el)return;const bounds=el.getBoundingClientRect(),next=new Map<string,{top:number;height:number;snapshot:HTMLElement}>();
  for(const node of Array.from(el.children) as HTMLElement[]){const id=node.dataset.motionId;if(!id)continue;const rect=node.getBoundingClientRect();next.set(id,{top:rect.top-bounds.top,height:rect.height,snapshot:inertSnapshot(node)});}
  const changed=[...next.keys()].join('|')!==[...previous.current.keys()].join('|');
  if(changed&&!reducedMotion()){
   animations.current.forEach(a=>a.cancel());ghosts.current.forEach(g=>g.remove());animations.current=[];ghosts.current=[];let rank=0;
   for(const node of Array.from(el.children) as HTMLElement[]){const id=node.dataset.motionId;if(!id)continue;const item=next.get(id)!,before=previous.current.get(id),delta=before?before.top-item.top:18;
    animations.current.push(node.animate([{translate:`0 ${delta}px`,opacity:before?1:0,scale:before?'1':'.97'},{translate:'0 0',opacity:1,scale:'1'}],{duration:500,delay:before?0:Math.min(rank++*45,180),easing:'cubic-bezier(.18,1,.3,1)',fill:'backwards'}));
   }
   for(const[id,item]of previous.current){if(next.has(id))continue;const ghost=item.snapshot;ghost.classList.add('motion-list-ghost');ghost.style.top=item.top+'px';ghost.style.height=item.height+'px';el.appendChild(ghost);ghosts.current.push(ghost);const a=ghost.animate([{opacity:.7,scale:'1'},{opacity:0,scale:'.92',translate:'0 -8px'}],{duration:240,easing:'ease-out',fill:'forwards'});animations.current.push(a);void a.finished.then(()=>ghost.remove()).catch(()=>{});}
  }
  previous.current=next;
 });
 useLayoutEffect(()=>()=>{animations.current.forEach(a=>a.cancel());ghosts.current.forEach(g=>g.remove());},[]);
 return <div className={`animated-list ${className}`} ref={root}>{children}</div>;
}
