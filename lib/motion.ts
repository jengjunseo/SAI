import {flushSync} from 'react-dom';

export function reducedMotion(){
 // This product explicitly defaults to full motion; the in-app setting remains an opt-out.
 return document.querySelector('.app-shell')?.classList.contains('reduce-motion')??false;
}

let current:ViewTransition|null=null;
let fallback:Animation|null=null;
/** A single, interruptible transition for navigation and completed data changes. */
export function move(update:()=>void,direction:'forward'|'back'='forward'){
 if(reducedMotion()){update();return Promise.resolve();}
 document.documentElement.dataset.navigation=direction;
 if(!document.startViewTransition){
  update();
  requestAnimationFrame(()=>{
   fallback?.cancel();
   fallback=document.querySelector('main')?.animate([{opacity:.45},{opacity:1}],{duration:260,easing:'cubic-bezier(.2,.75,.25,1)'})??null;
  });
  return Promise.resolve();
 }
 current?.skipTransition();
 const transition=document.startViewTransition(()=>{flushSync(update);});
 current=transition;
 void transition.finished.catch(()=>{}).finally(()=>{if(current===transition)current=null;});
 return transition.updateCallbackDone.catch(()=>{});
}
