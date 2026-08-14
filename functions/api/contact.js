function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(value,max){return String(value??'').trim().slice(0,max)}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}

export async function onRequestPost(context){
  try{
    const data=await context.request.json();
    if(data.website) return json({message:'Thanks.'});

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
