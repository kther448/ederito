const page=document.body.dataset.page||'';
const nav=[['Home','index.html','home'],['Services','services.html','services'],['Work','work.html','work'],['Pricing','pricing.html','pricing'],['Reviews','reviews.html','reviews'],['About','about.html','about'],['Contact','contact.html','contact']];

const h=document.getElementById('siteHeader');
if(h){
  h.className='site-header';
  h.innerHTML=`<a class="brand" href="index.html"><img src="assets/ederito-logo.svg" alt="EDERITO"></a><nav class="site-nav" id="siteNav">${nav.map(([a,b,c])=>`<a href="${b}" class="${page===c?'active':''}">${a}</a>`).join('')}</nav><a class="header-contact" href="contact.html">Start a project</a><button class="menu-button" id="menuButton" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>`;
}

const b=document.getElementById('menuButton'),n=document.getElementById('siteNav');
if(b&&n){
  b.onclick=()=>{
    const open=n.classList.toggle('open');
    b.setAttribute('aria-expanded',String(open));
  };
}

const f=document.getElementById('siteFooter');
if(f){
  f.className='site-footer';
  f.innerHTML=`<div><img src="assets/ederito-logo.svg" alt="EDERITO"><p>Independent design and digital support for small businesses.</p></div><div><a href="services.html">Services</a><a href="work.html">Work</a><a href="pricing.html">Pricing</a><a href="reviews.html">Reviews</a></div><div><a href="mailto:contact@ederito.com">contact@ederito.com</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><span>Operated by Zanara Labs LLC</span></div>`;
}

async function submit(form,url,status){
  const button=form.querySelector('button[type="submit"]');
  if(button)button.disabled=true;
  status.className='form-status';
  status.textContent='Sending...';
  try{
    const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||'Unable to submit right now.');
    status.className='form-status success';
    status.textContent=j.message||'Sent.';
    form.reset();
  }catch(error){
    status.className='form-status error';
    status.textContent=error.message||'Unable to submit right now.';
  }finally{
    if(button)button.disabled=false;
  }
}

const cf=document.getElementById('contactForm');
if(cf)cf.onsubmit=e=>{e.preventDefault();submit(cf,'/api/contact',document.getElementById('contactStatus'))};

const rf=document.getElementById('reviewForm');
if(rf)rf.onsubmit=e=>{e.preventDefault();submit(rf,'/api/reviews',document.getElementById('reviewStatus'))};

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

async function loadReviews(){
  const wall=document.getElementById('reviewWall');
  if(!wall)return;
  wall.innerHTML='<p class="muted">Loading reviews...</p>';
  try{
    const r=await fetch('/api/reviews?ts='+Date.now(),{cache:'no-store'});
    const data=await r.json();
    if(!r.ok)throw new Error('Could not load reviews.');
    const reviews=Array.isArray(data.reviews)?data.reviews:[];
    if(!reviews.length){
      wall.innerHTML='<p class="muted">No published reviews yet.</p>';
      return;
    }
    wall.innerHTML=reviews.map(review=>{
      const rating=Math.max(1,Math.min(5,Number(review.rating)||5));
      const name=escapeHtml(review.name||'Client');
      const business=escapeHtml(review.business||'');
      const service=escapeHtml(review.service||'Client');
      const text=escapeHtml(review.review||'');
      return `<article class="review-item"><div class="stars" aria-label="${rating} out of 5 stars">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</div><blockquote>“${text}”</blockquote><footer><strong>${name}</strong>${business?` · ${business}`:''}<br><span>${service}</span></footer></article>`;
    }).join('');
  }catch(error){
    wall.innerHTML='<p class="muted">Reviews are temporarily unavailable. Please refresh and try again.</p>';
  }
}

loadReviews();
