export function canonicalUrl(value,domains){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!domains.some(d=>u.hostname===d||u.hostname.endsWith('.'+d)))return null;u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_|^(?:fbclid|gclid)$/i.test(key))u.searchParams.delete(key);u.searchParams.sort();return u.href;}catch{return null;}
}
export function normalizeTitle(title){return title.toLowerCase().replace(/\[[^\]]*\]|\([^)]*(?:종합|속보)[^)]*\)/g,' ').replace(/[^가-힣a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');}
// Exact normalized headlines are safe candidates. Similar titles remain separate
// until an editor or a semantic verification step confirms the same event.
export function sameEvent(a,b){return a.publisherGroup!==b.publisherGroup&&normalizeTitle(a.title)===normalizeTitle(b.title)&&Math.abs(Date.parse(a.publishedAt)-Date.parse(b.publishedAt))<=48*3600000;}
