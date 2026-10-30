import { env } from 'cloudflare:workers';
import { handleAPI } from '@/lib/news-service.mjs';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>handleAPI(request,env);
export const POST=(request:Request)=>handleAPI(request,env);
export const PUT=(request:Request)=>handleAPI(request,env);
export const DELETE=(request:Request)=>handleAPI(request,env);
