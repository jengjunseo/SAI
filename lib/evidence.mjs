const PUBLISHERS={ 'yna.co.kr':'연합뉴스','reuters.com':'Reuters','apnews.com':'AP','bbc.com':'BBC','bbc.co.uk':'BBC','kbs.co.kr':'KBS','mbc.co.kr':'MBC','sbs.co.kr':'SBS','hani.co.kr':'한겨레','khan.co.kr':'경향신문','donga.com':'동아일보','chosun.com':'조선일보','joongang.co.kr':'중앙일보','hankookilbo.com':'한국일보','mk.co.kr':'매일경제','hankyung.com':'한국경제','yonhapnewstv.co.kr':'연합뉴스TV','worldbank.org':'세계은행','oecd.org':'OECD','imf.org':'IMF','who.int':'WHO','un.org':'UN','bok.or.kr':'한국은행','kdi.re.kr':'KDI','nature.com':'Nature','science.org':'Science','pnas.org':'PNAS','europa.eu':'유럽연합'};
export function credibleSource(value){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;u.hash='';const host=u.hostname.toLowerCase();let publisher=Object.entries(PUBLISHERS).find(([domain])=>host===domain||host.endsWith('.'+domain))?.[1];if(!publisher&&(/(^|\.)go\.kr$/.test(host)||/(^|\.)gov$/.test(host)))publisher=host;if(!publisher)return null;return {url:u.href,publisher};}catch{return null;}
}
export function attachEvidence(evidence,sources){
 const match=sources.find(s=>s.id===evidence?.sourceId);
 const source=match&&credibleSource(match.url);
 if(!source||!match.paragraphs.some(p=>p.id===evidence.paragraphId)||typeof evidence.fact!=='string'||!evidence.fact.trim()||evidence.fact.length>120)throw new Error('missing_evidence');
 return {...source,title:match.title.slice(0,180),fact:evidence.fact.trim(),paragraphId:evidence.paragraphId};
}

const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
export function sourceParagraphs(html){
 const safe=html.replace(/<(script|style|nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 const article=safe.match(/<div[^>]*class=["'][^"']*story-news[^"']*["'][^>]*>([\s\S]*?)(?:<div[^>]*class=["'][^"']*(?:article-copyright|article-tag)|<\/article>)/i)?.[1]||safe.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
 // Do not send page navigation or a subscription wall as evidence.
 if(!article)return [];
 return [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>plain(m[1]).replace(/^\([^)]*\)\s*[^=]{0,60}기자\s*=\s*/,'' )).filter(t=>t.length>=35&&!/무단 전재|재배포 금지|저작권자|구독|로그인|@/.test(t)).slice(0,18).map((text,i)=>({id:'p'+(i+1),text:text.slice(0,550)}));
}
export async function retrieveSources(article,fetcher=fetch){
 let source=credibleSource(article.url);if(!source)throw new Error('source_unavailable');
 let response;
 for(let i=0;i<4;i++){
  response=await fetcher(source.url,{redirect:'manual',headers:{Accept:'text/html','User-Agent':'SaiNews/1.0'},signal:AbortSignal.timeout(12000)});
  if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');source=location&&credibleSource(new URL(location,source.url).href);if(!source)throw new Error('source_unavailable');continue;}
  break;
 }
 if(!response?.ok||!response.headers.get('content-type')?.includes('text/html'))throw new Error('source_unavailable');
 const reader=response.body.getReader(),decoder=new TextDecoder();let html='',bytes=0;
 try{for(;;){const{done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>1500000){await reader.cancel();throw new Error('source_unavailable');}html+=decoder.decode(value,{stream:true});}html+=decoder.decode();}finally{reader.releaseLock();}
 // A known explicit prohibition must not be sent to an AI provider, including
 // through the older single-source path. Absence of a notice is not permission.
 if(/AI\s*학습\s*및\s*활용\s*금지/i.test(html))throw new Error('source_unavailable');
 const paragraphs=sourceParagraphs(html);if(paragraphs.length<2)throw new Error('source_unavailable');
 return [{id:'source-1',...source,title:article.title,paragraphs}];
}
