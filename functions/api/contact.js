function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
function clean(value,max){return String(value??'').trim().slice(0,max)}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}

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

async function sendInquiryEmail(apiKey,{name,email,business,service,budget,details}){
  if(!apiKey) throw new Error('RESEND_API_KEY is not configured.');

  const subject=`New EDERITO project request — ${service}`;
  const text=[
    'New project request from ederito.com',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Business: ${business||'Not provided'}`,
    `Service: ${service}`,
    `Budget: ${budget||'Not provided'}`,
    '',
    'Project details:',
    details
  ].join('\n');

  const html=`
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.55;max-width:680px;margin:auto">
      <div style="border-bottom:6px solid #a9df4b;padding:0 0 18px;margin-bottom:24px">
        <h1 style="font-size:26px;margin:0">New EDERITO project request</h1>
      </div>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Business:</strong> ${escapeHtml(business||'Not provided')}</p>
      <p><strong>Service:</strong> ${escapeHtml(service)}</p>
      <p><strong>Budget:</strong> ${escapeHtml(budget||'Not provided')}</p>
      <h2 style="font-size:18px;margin-top:28px">Project details</h2>
      <p style="white-space:pre-wrap">${escapeHtml(details)}</p>
      <p style="margin-top:30px;color:#666;font-size:13px">Submitted through ederito.com</p>
    </div>`;

  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{
      'authorization':`Bearer ${apiKey}`,
      'content-type':'application/json'
    },
    body:JSON.stringify({
      from:'EDERITO Website <notifications@ederito.com>',
      to:['contact@ederito.com'],
      reply_to:email,
      subject,
      text,
      html
    })
  });

  if(!response.ok){
    const body=await response.text();
    throw new Error(`Resend error ${response.status}: ${body}`);
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

    try{
      await sendInquiryEmail(context.env.RESEND_API_KEY,{name,email,business,service,budget,details});
    }catch(emailError){
      console.error('Inquiry saved, but notification email failed:',emailError);
    }

    return json({message:'Project request received. EDERITO will follow up by email.'},201);
  }catch(error){
    console.error('Contact submission failed:',error);
    return json({error:'Unable to submit your request right now.'},500);
  }
}
