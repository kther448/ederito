function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(value,max){return String(value??'').trim().slice(0,max)}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}
function esc(value){return clean(value,3000)}

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
