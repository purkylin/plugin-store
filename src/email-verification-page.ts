export function emailVerificationPage(): Response {
  return new Response(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>激活账号 · Hawk Plugin Store</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#07111f;color:#ecf7ff;font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{width:100%;max-width:420px;padding:28px;background:#0f1f33;border:1px solid #293c50;border-radius:20px}h1{font-size:24px;margin-top:0}p{color:#91a9bb}button{font:inherit;padding:10px 18px;border:0;border-radius:11px;background:#55d6be;color:#06251f;font-weight:700;cursor:pointer}button:disabled{opacity:.5}a{color:#6ca9ff}#notice{white-space:pre-wrap}[hidden]{display:none!important}</style></head>
<body><main><h1>激活账号</h1><p>如果这是你本人发起的注册，请确认激活邮箱对应的账号。</p><button id="verify" type="button">确认激活</button><p id="notice" role="status" aria-live="polite"></p><p><a href="/login">返回登录</a> · <a href="/register">重新注册 / 发送激活邮件</a></p></main>
<script>
const token = new URLSearchParams(location.hash.slice(1)).get("token") || "";
history.replaceState(null,"",location.pathname);
const button = document.getElementById("verify"), notice = document.getElementById("notice");
if(!/^[A-Za-z0-9_-]{43}$/.test(token)){button.hidden=true;notice.textContent="激活链接不完整，请从邮件重新打开，或返回注册页面重新发送。";}
button.addEventListener("click",async()=>{
 button.disabled=true;notice.textContent="正在激活…";
 try{
  const response=await fetch("/api/v1/auth/verify-email",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token})});
  const result=await response.json();
  if(!response.ok){if(result.code==="invalid_verification_token")button.hidden=true;throw new Error(result.message||"激活失败，请重试。");}
  notice.textContent=result.message;button.hidden=true;
 }catch(error){notice.textContent=error instanceof TypeError?"网络连接失败，请重试。":error.message;}
 finally{button.disabled=false;}
});
</script></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'" } });
}
