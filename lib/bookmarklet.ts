// The Carrie Me Away bookmarklet program, shared by the /bookmarklet page and the live /bm.js route.
// Written readable, joined onto one line (statements end in ';', no // comments inside the strings).

// Redfin search/list pages (no /home/ in the path): add every result card on the page.
// Cards are sent one at a time — the API geocodes via Nominatim, which allows ~1 req/s.
// Written readable here, then joined onto one line (statements must end in ';', no // comments).
const SEARCH_PAGE_JS = `
var n=document.createElement('div');
n.style.cssText='position:fixed;top:16px;right:16px;z-index:2147483647;background:#1e40af;color:#fff;padding:12px 20px;border-radius:12px;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;box-shadow:0 4px 24px rgba(0,0,0,.35);max-width:360px';
document.body.appendChild(n);
var seen={};var items=[];var geo={};
document.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){try{[].concat(JSON.parse(s.textContent)).forEach(function(o){if(o&&o.url&&o.geo)geo[o.url]=o.geo;});}catch(e){}});
document.querySelectorAll('.bp-Homecard').forEach(function(c){
  var a=c.querySelector('a[href*="/home/"]');if(!a)return;
  var href=new URL(a.getAttribute('href'),location.origin).href;if(seen[href])return;seen[href]=1;
  var lines=c.innerText.split('\\n').map(function(l){return l.trim();}).filter(Boolean);
  var i=-1;lines.forEach(function(l,k){if(i<0&&/^\\$[\\d,]+$/.test(l))i=k;});
  if(i<0)return;
  var img=c.querySelector('img[src^="http"]');
  var g=geo[href]||{};
  items.push({url:href,text:lines.slice(i).join('\\n'),photoUrl:img?img.src:null,lat:g.latitude,lng:g.longitude});
});
if(!items.length){n.style.background='#dc2626';n.textContent='No listings found on this page.';setTimeout(function(){n.remove();},5000);return;}
var added=0,existed=0,failed=0,filled=0;
function pageText(html){
  var doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('script,style,noscript,svg').forEach(function(e){e.remove();});
  var w=doc.createTreeWalker(doc.body,4),parts=[],x;
  while((x=w.nextNode())){var t=x.nodeValue.trim();if(t)parts.push(t);}
  return parts.join(' ');
}
function subdiv(url){
  var id=(url.match(/\\/home\\/(\\d+)/)||[])[1];if(!id)return Promise.resolve(null);
  return fetch('/stingray/api/home/details/belowTheFold?propertyId='+id+'&accessLevel=1').then(function(r){return r.text();})
    .then(function(t){var m=t.match(/"amenityName":"Subdivision Name"[^\\]]*?"amenityValues":\\["([^"]+)"/);return m?m[1]:null;}).catch(function(){return null;});
}
function enrich(it,setType){
  return Promise.all([fetch(it.url).then(function(r){return r.text();}),subdiv(it.url)])
    .then(function(res){return fetch('__BASE__/api/enrich-listing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:it.url,text:pageText(res[0]),setType:setType,subdivision:res[1]})});})
    .then(function(r){return r.json();})
    .then(function(e){if(e.updated&&Object.keys(e.updated).length)filled++;})
    .catch(function(){});
}
function next(k){
  if(k>=items.length){
    n.style.background=failed?'#d97706':'#059669';
    n.textContent='\\u2713 Added '+added+' \\u00b7 '+existed+' already saved \\u00b7 details filled for '+filled+(failed?' \\u00b7 '+failed+' failed':'');
    setTimeout(function(){n.remove();},10000);return;
  }
  n.textContent='Adding '+(k+1)+' of '+items.length+' to Carrie Me Away + filling in details\\u2026';
  var it=items[k];
  fetch('__BASE__/api/add-listing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:it.url,text:it.text,photoUrl:it.photoUrl,lat:it.lat,lng:it.lng,skipExisting:true})})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.error){failed++;return;}
      if(d.alreadyExists)existed++;else added++;
      return enrich(it,!d.alreadyExists);
    })
    .catch(function(){failed++;})
    .then(function(){next(k+1);});
}
next(0);
`

// Redfin rentals search pages (/rentals/ in the path): save every card as a rent comp in one
// batch. The page must be filtered to one property type so comps match like-for-like.
const RENTALS_PAGE_JS = `
var n=document.createElement('div');
n.style.cssText='position:fixed;top:16px;right:16px;z-index:2147483647;background:#1e40af;color:#fff;padding:12px 20px;border-radius:12px;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;box-shadow:0 4px 24px rgba(0,0,0,.35);max-width:360px';
document.body.appendChild(n);
function done(bg,msg){n.style.background=bg;n.textContent=msg;setTimeout(function(){n.remove();},8000);}
var pt=(location.pathname.match(/property-type=([^,/]+)/)||[])[1];
var ptype={townhouse:'Townhouse',house:'Single Family',condo:'Condo'}[pt];
if(!ptype){done('#dc2626','Filter this Redfin search to one property type (Townhouse, House or Condo) first.');return;}
var geo={};
document.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){try{[].concat(JSON.parse(s.textContent)).forEach(function(o){if(o&&o.url&&o.geo)geo[o.url]=o.geo;});}catch(e){}});
var seen={};var rentals=[];
document.querySelectorAll('.bp-Homecard').forEach(function(c){
  var a=c.querySelector('a[href*="/home/"]');if(!a)return;
  var href=new URL(a.getAttribute('href'),location.origin).href;if(seen[href])return;seen[href]=1;
  var t=c.innerText.replace(/\\s+/g,' ');
  var m=t.match(/\\$([\\d,]+)\\/mo\\s+(\\d+) beds?\\s+([\\d.]+) baths?\\s+([\\d,]+|\\u2014) sq ft\\s+(.+?, [A-Z]{2} \\d{5})/);
  if(!m)return;
  var g=geo[href]||{};
  rentals.push({url:href,rent:+m[1].replace(/,/g,''),beds:+m[2],baths:+m[3],sqft:m[4]==='\\u2014'?null:+m[4].replace(/,/g,''),address:m[5],lat:g.latitude,lng:g.longitude});
});
if(!rentals.length){done('#dc2626','No rentals found on this page.');return;}
n.textContent='Saving '+rentals.length+' rental comps\\u2026';
fetch('__BASE__/api/add-rentals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rentals:rentals,propertyType:ptype})})
  .then(function(r){return r.json();})
  .then(function(d){if(d.error)done('#dc2626','Error: '+d.error);else done('#059669','\\u2713 Saved '+d.saved+' '+ptype.toLowerCase()+' rental comps'+(d.skipped?' \\u00b7 '+d.skipped+' skipped':''));})
  .catch(function(){done('#dc2626','Could not reach app \\u2014 check your connection.');});
`

/** Full bookmarklet program (an IIFE), for the given app origin. Served live at /bm.js. */
export function buildBookmarkletCode(baseUrl: string): string {
  const searchJs = SEARCH_PAGE_JS.replace(/\n\s*/g, '').replaceAll('__BASE__', baseUrl)
  const rentalsJs = RENTALS_PAGE_JS.replace(/\n\s*/g, '').replaceAll('__BASE__', baseUrl)
  return `(function(){if(location.hostname.includes('redfin.com')&&location.pathname.includes('/rentals')){${rentalsJs}return;}if(location.hostname.includes('redfin.com')&&!location.pathname.includes('/home/')){${searchJs}return;}var url=location.href;var text=document.body.innerText;var wt=(function(){var w=document.createTreeWalker(document.body,4),p=[],x;while((x=w.nextNode())){var pe=x.parentElement;if(pe&&/^(SCRIPT|STYLE|NOSCRIPT)$/.test(pe.tagName))continue;var t=x.nodeValue.trim();if(t)p.push(t);}return p.join(' ');})();var gp=(document.querySelector('meta[name="geo.position"]')?.content||'').split(/[;,]/);var photoUrl=document.querySelector('meta[property="og:image"]')?.content||null;var propertyType=null;try{document.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){if(propertyType)return;var d=JSON.parse(s.textContent);[].concat(d['@type']||[]).forEach(function(t){if(propertyType)return;var tl=t.toLowerCase();if(tl.includes('condominium'))propertyType='Condo';else if(tl.includes('singlefamily')||tl==='house'||tl.includes('single_family'))propertyType='Single Family';else if(tl.includes('townhouse')||tl.includes('townhome'))propertyType='Townhouse';});});}catch(e){}var n=document.createElement('div');n.style.cssText='position:fixed;top:16px;right:16px;z-index:2147483647;background:#1e40af;color:#fff;padding:12px 20px;border-radius:12px;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;box-shadow:0 4px 24px rgba(0,0,0,.35)';n.textContent='Adding to Carrie Me Away\u2026';document.body.appendChild(n);fetch('${baseUrl}/api/add-listing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url,text:text,photoUrl:photoUrl,propertyType:propertyType,lat:gp[0]?Number(gp[0]):null,lng:gp[1]?Number(gp[1]):null,skipExisting:true})}).then(function(r){return r.json()}).then(function(d){if(d.error){n.style.background='#dc2626';n.textContent='Error: '+d.error;setTimeout(function(){n.remove()},5000);return;}var hid=(url.match(/\\/home\\/(\\d+)/)||[])[1];return fetch('/stingray/api/home/details/belowTheFold?propertyId='+hid+'&accessLevel=1').then(function(r){return r.text()}).then(function(t){var m=t.match(/"amenityName":"Subdivision Name"[^\\]]*?"amenityValues":\\["([^"]+)"/);return m?m[1]:null}).catch(function(){return null}).then(function(sd){return fetch('${baseUrl}/api/enrich-listing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url,text:wt,setType:!d.alreadyExists,subdivision:sd})})}).then(function(r){return r.json()}).catch(function(){return {};}).then(function(e){var u=e&&e.updated?Object.keys(e.updated).length:0;if(d.alreadyExists){n.style.background='#7c3aed';n.textContent='\u2713 Already saved: '+d.parsed.address+(u?' \u00b7 filled in '+u+' detail'+(u>1?'s':''):' \u00b7 nothing new');}else{n.style.background='#059669';n.textContent='\u2713 Added: '+d.parsed.address+' \u00b7 $'+(d.parsed.price||0).toLocaleString();}setTimeout(function(){n.remove()},5000);});}).catch(function(){n.style.background='#dc2626';n.textContent='Could not reach app \u2014 check your connection.';setTimeout(function(){n.remove()},5000);});})();`
}


/**
 * The link users save as a bookmark: loads the latest program from the app (/bm.js), so fixes apply
 * without re-copying. If the page blocks external scripts, it runs the copy embedded at save time.
 */
export function buildBookmarkletLink(baseUrl: string): string {
  const embedded = buildBookmarkletCode(baseUrl)
  return `javascript:(function(){var s=document.createElement('script');s.src='${baseUrl}/bm.js?t='+Date.now();s.onerror=function(){${embedded}};document.body.appendChild(s);})();`
}
