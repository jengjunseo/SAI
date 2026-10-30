export const PREPARE_MS=3000;
export const initialPlayback={index:0,phase:'preparing'};
export function playback(state,action){
 if(action.type==='READY')return state.phase==='preparing'?{...state,phase:'revealed'}:state;
 if(action.type==='NEXT')return state.phase==='revealed'?{...state,phase:'leaving'}:state;
 if(action.type==='LEFT')return state.phase==='leaving'?(state.index===5?{...state,phase:'complete'}:{index:state.index+1,phase:'preparing'}):state;
 if(action.type==='PREVIOUS')return state.index>0&&state.phase!=='leaving'?{index:state.index-1,phase:'revealed'}:state;
 if(action.type==='REPLAY')return {...initialPlayback};
 return state;
}
