// Availability is not permission to republish or send article text to an AI service.
// These feeds are for an explicitly invoked, metadata-only shadow run.
export const SOURCES = [
 {key:'google-kr',publisher:'Google News',publisherGroup:'google',type:'discovery',url:'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko',domains:['news.google.com'],maxItems:100},
 {key:'yna-politics',publisher:'연합뉴스',publisherGroup:'yonhap',type:'direct',url:'https://www.yna.co.kr/rss/politics.xml',domains:['yna.co.kr'],maxItems:120},
 {key:'yna-economy',publisher:'연합뉴스',publisherGroup:'yonhap',type:'direct',url:'https://www.yna.co.kr/rss/economy.xml',domains:['yna.co.kr'],maxItems:120},
 {key:'yna-world',publisher:'연합뉴스',publisherGroup:'yonhap',type:'direct',url:'https://www.yna.co.kr/rss/international.xml',domains:['yna.co.kr'],maxItems:120},
 {key:'hani',publisher:'한겨레',publisherGroup:'hani',type:'direct',url:'https://www.hani.co.kr/rss/',domains:['hani.co.kr'],maxItems:100},
 {key:'khan',publisher:'경향신문',publisherGroup:'khan',type:'direct',url:'https://www.khan.co.kr/rss/rssdata/total_news.xml',domains:['khan.co.kr'],maxItems:100},
 {key:'sbs',publisher:'SBS',publisherGroup:'sbs',type:'direct',url:'https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=01',domains:['sbs.co.kr'],maxItems:100},
 {key:'etnews',publisher:'전자신문',publisherGroup:'etnews',type:'direct',url:'https://rss.etnews.com/Section901.xml',domains:['etnews.com'],maxItems:100},
];
