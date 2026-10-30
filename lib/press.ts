import {reducedMotion} from './motion';
/** Delegated feedback also covers controls that mount inside sheets and tab panels. */
export function installPressFeedback(){
 let current:HTMLElement|null=null,animation:Animation|null=null;
 const release=()=>{if(!current)return;const el=current;current=null;animation?.cancel();if(reducedMotion())return;animation=el.animate([{scale:'.95'},{scale:'1.025',offset:.46},{scale:'.993',offset:.73},{scale:'1'}],{duration:460,easing:'cubic-bezier(.2,.7,.25,1)'});};
 const press=(event:PointerEvent|KeyboardEvent)=>{if(reducedMotion()||('button'in event&&event.button!==0))return;const target=event.target instanceof Element?event.target.closest<HTMLElement>('button,a'):null;if(!target||target.matches(':disabled'))return;animation?.cancel();current=target;animation=target.animate([{scale:'1'},{scale:'.95'}],{duration:100,fill:'forwards',easing:'cubic-bezier(.2,.8,.3,1)'});};
 const down=(e:KeyboardEvent)=>{if(['Enter',' '].includes(e.key)&&!e.repeat)press(e);};
 document.addEventListener('pointerdown',press);document.addEventListener('pointerup',release);document.addEventListener('pointercancel',release);document.addEventListener('keydown',down);document.addEventListener('keyup',release);window.addEventListener('blur',release);
 return()=>{animation?.cancel();document.removeEventListener('pointerdown',press);document.removeEventListener('pointerup',release);document.removeEventListener('pointercancel',release);document.removeEventListener('keydown',down);document.removeEventListener('keyup',release);window.removeEventListener('blur',release);};
}
