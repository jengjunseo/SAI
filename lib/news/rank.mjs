// This is a review queue, not an editorial decision or a fact check. Two
// publishers can reproduce the same wire report, so a group count is only a hint.
export function reviewQueue(issues){
 return issues.map(issue=>{
  const publishers=new Set(issue.candidates.filter(c=>c.resolutionStatus==='domain_matched').map(c=>c.publisherGroup));
  return {...issue,publisherCount:publishers.size,reviewStatus:publishers.size>=2?'needs_evidence_review':'needs_more_sources'};
 }).sort((a,b)=>b.publisherCount-a.publisherCount||Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
}
