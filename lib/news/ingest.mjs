import {SOURCES} from './config.mjs';
import {canonicalUrl} from './cluster.mjs';

export async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,24);}

// Parser and body reader are injected so collection is independent from presentation.
export async function collectFeeds({fetcher=fetch,parse,read,now=Date.now(),sources=SOURCES}){
 const runs=await Promise.all(sources.map(async source=>{
  try{
   const response=await fetcher(source.url,{headers:{Accept:'application/rss+xml, application/xml, text/xml','User-Agent':'SaiNews/2.0'},signal:AbortSignal.timeout(16000)});
   if(!response.ok)throw new Error('http_error');
   const body=await read(response);
   if(!/<(?:rss|rdf:RDF|feed)(?:\s|>)/i.test(body))throw new Error('invalid_feed');
   const items=parse(body,source.publisher,now).slice(0,source.maxItems);
   const candidates=await Promise.all(items.map(async item=>{
    const url=canonicalUrl(item.url,source.domains);
    // Google links are discovery-only; no redirect is treated as a verified original.
    const direct=source.type==='direct'&&url;
    return {id:await hash((direct?'direct:':'discovery:')+(url||item.url)),sourceKey:source.key,publisher:direct?source.publisher:item.source,publisherGroup:direct?source.publisherGroup:'discovery:'+item.source,discoveryUrl:item.url,canonicalUrl:direct?url:null,title:item.title,description:'',category:item.category,publishedAt:item.publishedAt,discoveredAt:now,resolutionStatus:direct?'domain_matched':'metadata_only'};
   }));
   return {sourceKey:source.key,status:'ok',candidates};
  }catch{return {sourceKey:source.key,status:'error',errorCode:'feed_unavailable',candidates:[]};}
 }));
 return runs;
}
