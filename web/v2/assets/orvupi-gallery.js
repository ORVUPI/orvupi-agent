(async function(){
 const grid=document.getElementById('or-gallery');if(!grid)return;
 const count=document.getElementById('or-gallery-count');
 const response=await fetch('/assets/orvupi/catalogo.json');if(!response.ok){count.textContent='No se pudo abrir la colección. Recarga para intentarlo de nuevo.';return;}
 const items=await response.json(),search=document.getElementById('or-search'),category=document.getElementById('or-category'),chips=document.getElementById('or-chips'),more=document.getElementById('or-more');
 const STEP=24;let limit=STEP,current='';
 const en=()=>(document.documentElement.getAttribute('data-lang')||document.documentElement.lang||'').toLowerCase().startsWith('en');
 const cols=[];const seen=new Map();
 for(const x of items){if(!seen.has(x.collection)){const c={slug:x.collection,es:x.collection_es,en:x.collection_en,n:0};seen.set(x.collection,c);cols.push(c);}seen.get(x.collection).n++;}
 const albumImages=document.querySelector("[data-album-images]");
 const albumCols=document.querySelector("[data-album-collections]");
 if(albumImages)albumImages.textContent=String(items.length);
 if(albumCols)albumCols.textContent=String(new Set(items.map(x=>x.category_slug)).size);
 const fromHash=()=>{const m=location.hash.match(/coleccion=([\w-]+)/);return m&&seen.has(m[1])?m[1]:'';};
 current=fromHash();
 function chip(slug,label,n){const b=document.createElement('button');b.type='button';b.className='or-chip';b.dataset.slug=slug;b.setAttribute('aria-pressed',String(slug===current));b.append(label+' ');const s=document.createElement('span');s.textContent=n;b.append(s);b.addEventListener('click',()=>select(slug));return b;}
 function buildControls(){
  category.replaceChildren();const all=document.createElement('option');all.value='';all.textContent=en()?'All collections':'Todas las colecciones';category.append(all);
  for(const c of cols){const o=document.createElement('option');o.value=c.slug;o.textContent=(en()?c.en:c.es)+' ('+c.n+')';category.append(o);}
  category.value=current;
  if(chips){chips.replaceChildren(chip('',en()?'All':'Todas',items.length));for(const c of cols)chips.append(chip(c.slug,en()?c.en:c.es,c.n));}
 }
 function select(slug){current=slug;limit=STEP;category.value=slug;if(chips)for(const b of chips.children)b.setAttribute('aria-pressed',String(b.dataset.slug===slug));history.replaceState(null,'',slug?'#coleccion='+slug:location.pathname);render();}
 function card(x){
  const card=document.createElement('article');card.className='or-card';const link=document.createElement('a');link.href='/assets/orvupi/album/'+x.file;
  link.setAttribute('download',x.file.split('/').pop());
  const img=document.createElement('img');img.src=link.href;img.alt=x.title_es;img.loading='lazy';img.decoding='async';img.width=x.width||280;img.height=x.height||280;link.append(img);
  const body=document.createElement('div');body.className='or-card-body';const h=document.createElement('h3');h.textContent=(x.num?String(x.num).padStart(3,'0')+' · ':'')+x.title_es;
  const p=document.createElement('small');p.textContent=en()?x.collection_en:x.collection_es;const d=document.createElement('p');const ext=x.file.endsWith('.webp')?'WEBP':'PNG';d.textContent=(en()?'Download ':'Descargar ')+ext+' ↓';
  body.append(h,p,d);link.append(body);card.append(link);return card;}
 function render(){
  const q=search.value.toLocaleLowerCase('es').trim();
  const found=items.filter(x=>(!current||x.collection===current)&&(!q||(x.title_es+' '+x.collection_es+' '+x.collection_en+' '+(x.num?String(x.num).padStart(3,'0'):'')).toLocaleLowerCase('es').includes(q)));
  grid.replaceChildren(...found.slice(0,limit).map(card));
  const c=seen.get(current);count.textContent=found.length+' / '+items.length+' · '+(c?(en()?c.en:c.es):(en()?'All collections':'Todas las colecciones'));
  more.hidden=found.length<=limit;}
 search.addEventListener('input',()=>{limit=STEP;render();});
 category.addEventListener('change',()=>select(category.value));
 more.addEventListener('click',()=>{limit+=STEP;render();});
 if('IntersectionObserver' in window){new IntersectionObserver(e=>{if(e[0].isIntersecting&&!more.hidden){limit+=STEP;render();}},{rootMargin:'400px'}).observe(more);}
 window.addEventListener('hashchange',()=>select(fromHash()));
 document.addEventListener('orvupi-lang',()=>{buildControls();render();});
 buildControls();render();
})().catch(()=>{const c=document.getElementById('or-gallery-count');if(c)c.textContent='No se pudo cargar la colección.';});
