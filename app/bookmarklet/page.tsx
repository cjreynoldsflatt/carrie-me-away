'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

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
var added=0,existed=0,failed=0;
function next(k){
  if(k>=items.length){
    n.style.background=failed?'#d97706':'#059669';
    n.textContent='\\u2713 Added '+added+' \\u00b7 '+existed+' already saved'+(failed?' \\u00b7 '+failed+' failed':'');
    setTimeout(function(){n.remove();},8000);return;
  }
  n.textContent='Adding '+(k+1)+' of '+items.length+' to Carrie Me Away\\u2026';
  var it=items[k];
  fetch('__BASE__/api/add-listing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:it.url,text:it.text,photoUrl:it.photoUrl,lat:it.lat,lng:it.lng,skipExisting:true})})
    .then(function(r){return r.json();})
    .then(function(d){if(d.error)failed++;else if(d.alreadyExists)existed++;else added++;})
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

function buildBookmarklet(baseUrl: string): string {
  const searchJs = SEARCH_PAGE_JS.replace(/\n\s*/g, '').replace('__BASE__', baseUrl)
  const rentalsJs = RENTALS_PAGE_JS.replace(/\n\s*/g, '').replace('__BASE__', baseUrl)
  return `javascript:(function(){if(location.hostname.includes('redfin.com')&&location.pathname.includes('/rentals')){${rentalsJs}return;}if(location.hostname.includes('redfin.com')&&!location.pathname.includes('/home/')){${searchJs}return;}var url=location.href;var text=document.body.innerText;var gp=(document.querySelector('meta[name="geo.position"]')?.content||'').split(/[;,]/);var photoUrl=document.querySelector('meta[property="og:image"]')?.content||null;var propertyType=null;try{document.querySelectorAll('script[type="application/ld+json"]').forEach(function(s){if(propertyType)return;var d=JSON.parse(s.textContent);[].concat(d['@type']||[]).forEach(function(t){if(propertyType)return;var tl=t.toLowerCase();if(tl.includes('condominium'))propertyType='Condo';else if(tl.includes('singlefamily')||tl==='house'||tl.includes('single_family'))propertyType='Single Family';else if(tl.includes('townhouse')||tl.includes('townhome'))propertyType='Townhouse';});});}catch(e){}var n=document.createElement('div');n.style.cssText='position:fixed;top:16px;right:16px;z-index:2147483647;background:#1e40af;color:#fff;padding:12px 20px;border-radius:12px;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;box-shadow:0 4px 24px rgba(0,0,0,.35)';n.textContent='Adding to Carrie Me Away\u2026';document.body.appendChild(n);fetch('${baseUrl}/api/add-listing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url,text:text,photoUrl:photoUrl,propertyType:propertyType,lat:gp[0]?Number(gp[0]):null,lng:gp[1]?Number(gp[1]):null})}).then(function(r){return r.json()}).then(function(d){if(d.error){n.style.background='#dc2626';n.textContent='Error: '+d.error;}else if(d.alreadyExists){n.style.background='#7c3aed';n.textContent='\u2713 Already saved: '+d.parsed.address;}else{n.style.background='#059669';n.textContent='\u2713 Added: '+d.parsed.address+' \u00b7 $'+(d.parsed.price||0).toLocaleString();}setTimeout(function(){n.remove()},5000);}).catch(function(){n.style.background='#dc2626';n.textContent='Could not reach app \u2014 check your connection.';setTimeout(function(){n.remove()},5000);});})();`
}

export default function BookmarkletPage() {
  const [copied, setCopied] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const bookmarkletJs = buildBookmarklet(baseUrl)

  function copyCode() {
    navigator.clipboard.writeText(bookmarkletJs)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 max-w-xl w-full p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bookmarklet</h1>
          <p className="text-sm text-slate-500 mt-1">
            One-click add from any Redfin or Realtor.com listing page — or every result on a Redfin search page. On a Redfin rentals search, it saves the rentals as rent comps.
          </p>
        </div>

        {/* Copy button */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Step 1 — Copy the bookmarklet code</p>
          <div className="relative">
            <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 pr-10 overflow-x-auto text-[11px] text-slate-600 whitespace-pre-wrap break-all leading-relaxed max-h-28">
              {bookmarkletJs}
            </pre>
            <button
              onClick={copyCode}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-700 transition-colors"
              title="Copy"
            >
              {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
            </button>
          </div>
          <button
            onClick={copyCode}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy bookmarklet code</>}
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Step 2 — Create a bookmark manually</p>
          <ol className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Show your bookmarks bar if hidden: <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">Ctrl+Shift+B</kbd> (Win) / <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">⌘+Shift+B</kbd> (Mac)</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>Right-click the bookmarks bar → <strong>Add page…</strong> or <strong>Add bookmark</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Set the <strong>Name</strong> to <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">+ Carrie Me Away</span> and paste the copied code into the <strong>URL</strong> field</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
              <span>On any Redfin or Realtor.com listing, click the bookmark — a notification confirms the listing was saved. On a Redfin search page, it adds every listing shown (already-saved ones are left untouched).</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">5</span>
              <span>For better rent estimates: on Redfin, search <strong>For rent</strong>, filter to one property type (e.g. Townhouse), and click the bookmark. Those rentals become comps — listings with 3+ same-bed comps nearby use them instead of HUD.</span>
            </li>
          </ol>
        </div>

        <a href="/" className="block text-center text-xs text-blue-500 hover:text-blue-700">
          ← Back to app
        </a>
      </div>
    </div>
  )
}
