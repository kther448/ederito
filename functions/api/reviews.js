function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(value,max){return String(value??'').trim().slice(0,max)}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}
function esc(value){return clean(value,3000)}

async function verifyTurnstile(token,secret,ip){
  if(!secret) return {success:false,error:'Turnstile secret is not configured.'};
  if(!token) return {success:false,error:'Please complete the security check.'};
  const form=new FormData();
  form.append('secret',secret);
  form.append('response',token);
  if(ip) form.append('remoteip',ip);
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form});
  const result=await response.json();
  return {success:Boolean(result.success),error:result.success?'':'Security verification failed.'};
}

export async function onRequestGet(context){
  try{
    if(!context.env.EDERITO_DB) return json({reviews:[]});
    const result=await context.env.EDERITO_DB
      .prepare("SELECT id,name,business,service,rating,review,created_at FROM reviews WHERE status='approved' ORDER BY COALESCE(approved_at,created_at) DESC LIMIT 50")
      .all();
    return json({reviews:result.results||[]});
  }catch(error){
    return json({reviews:[]});
  }
}

export async function onRequestPost(context){
  try{
    const data=await context.request.json();
    if(data.website) return json({message:'Thanks.'});

    const verification=await verifyTurnstile(
      data['cf-turnstile-response'],
      context.env.TURNSTILE_SECRET_KEY,
      context.request.headers.get('CF-Connecting-IP')||''
    );
    if(!verification.success) return json({error:verification.error},400);

    const name=clean(data.name,100);
    const business=clean(data.business,160);
    const email=clean(data.email,200);
    const service=clean(data.service,100);
    const review=esc(data.review);
    const rating=Number(data.rating);
    const consent=data.consent==='yes';

    if(!name||!validEmail(email)||!service||!review||!Number.isInteger(rating)||rating<1||rating>5||!consent){
      return json({error:'Please complete every required review field.'},400);
    }
    if(!context.env.EDERITO_DB){
      return json({error:'Review storage is not configured.'},503);
    }

    await context.env.EDERITO_DB
      .prepare("INSERT INTO reviews (name,business,email,service,rating,review,status) VALUES (?,?,?,?,?,?,'pending')")
      .bind(name,business,email,service,rating,review)
      .run();

    return json({message:'Thank you. Your review was submitted and is waiting for approval.'},201);
  }catch(error){
    return json({error:'Unable to submit your review right now.'},500);
  }
}
