function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(value,max){return String(value??'').trim().slice(0,max)}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}

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
    const email=clean(data.email,200);
    const business=clean(data.business,160);
    const service=clean(data.service,100);
    const budget=clean(data.budget,80);
    const details=clean(data.details,4000);

    if(!name||!validEmail(email)||!service||!details){
      return json({error:'Please complete the required fields.'},400);
    }
    if(!context.env.EDERITO_DB){
      return json({error:'Contact storage is not configured.'},503);
    }

    await context.env.EDERITO_DB
      .prepare('INSERT INTO inquiries (name,email,business,service,budget,details) VALUES (?,?,?,?,?,?)')
      .bind(name,email,business,service,budget,details)
      .run();

    return json({message:'Project request received. EDERITO will follow up by email.'},201);
  }catch(error){
    return json({error:'Unable to submit your request right now.'},500);
  }
}
