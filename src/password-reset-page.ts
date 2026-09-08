export function passwordResetPage(reset: boolean): Response {
  return new Response(`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${reset ? "重置密码" : "找回密码"} · Hawk Plugin Store</title>
<style> *{box-sizing:border-box}body{margin:0;background:#f4f6f8;color:#172331;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}main{background:white;border:1px solid #dde3e9;border-radius:20px;padding:32px;width:100%;max-width:440px}h1{font-size:26px;margin:0 0 8px}p{color:#526271}label{display:block;margin-top:18px}input,button{font:inherit;width:100%;padding:12px;border-radius:10px;border:1px solid #bcc8d2}button{background:#176b55;color:white;border:0;margin-top:24px;cursor:pointer}button:disabled{opacity:.6;cursor:wait}a{color:#176b55}#notice{white-space:pre-wrap}.error{color:#b42318}input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #78bfae;outline-offset:3px}[hidden]{display:none!important}</style></head>
<body><main><h1>${reset ? "重置密码" : "找回密码"}</h1><p>${reset ? "设置新密码后，所有设备需要重新登录。" : "输入注册邮箱，我们会发送重置密码链接。"}</p>
<form id="form">${reset ? '<label for="password">新密码</label><input id="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required><label for="confirmation">确认新密码</label><input id="confirmation" type="password" autocomplete="new-password" minlength="8" maxlength="128" required>' : '<label for="email">注册邮箱</label><input id="email" type="email" autocomplete="email" maxlength="254" required>'}
<button id="send" type="submit">${reset ? "更新密码" : "发送重置链接"}</button></form><p id="notice" role="status" aria-live="polite"></p><p id="retry" hidden><a href="/forgot-password">重新申请重置链接</a></p><a href="/login">返回登录</a></main>
<script>
const reset = ${reset};
const token = new URLSearchParams(location.hash.slice(1)).get("token") || "";
if (reset) history.replaceState(null, "", location.pathname);
const form = document.getElementById("form"), notice = document.getElementById("notice"), send = document.getElementById("send"), retry = document.getElementById("retry");
if (reset && !/^[A-Za-z0-9_-]{43}$/.test(token)) { form.hidden = true; retry.hidden = false; notice.textContent = "重置链接不完整，请重新申请。"; }
form.addEventListener("submit", async (event) => {
 event.preventDefault(); notice.className = "";
 const body = reset ? {token, password: document.getElementById("password").value, password_confirmation: document.getElementById("confirmation").value} : {email: document.getElementById("email").value.trim()};
 if (reset && body.password !== body.password_confirmation) {notice.textContent = "两次输入的密码不一致。";notice.className = "error";return;}
 send.disabled = true; notice.textContent = "正在提交…";
 let cooldown = false;
 try {
  const response = await fetch("/api/v1/auth/" + (reset ? "reset-password" : "forgot-password"), {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const data = await response.json();
  if (!response.ok) {if(data.code === "invalid_reset_token") {retry.hidden = false;form.hidden = true;}throw new Error(data.message || "暂时无法处理，请稍后再试。");}
  notice.textContent = data.message;
  if(reset) {form.reset();form.hidden = true;} else {
   cooldown = true; let seconds = 60; send.textContent = seconds + " 秒后可重新发送";
   const timer = setInterval(() => {seconds--;send.textContent = seconds + " 秒后可重新发送";if(seconds <= 0){clearInterval(timer);send.disabled = false;send.textContent = "重新发送重置链接";}},1000);
  }
 } catch(error) {notice.textContent = error instanceof TypeError ? "网络连接失败，请重试。" : error.message;notice.className = "error";}
 finally {if(!cooldown) send.disabled = false;}
});
</script></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'" } });
}
