export const pushPreviewDialog = String.raw`
<dialog id="push-content-dialog" aria-labelledby="push-content-title">
  <div class="card-head"><h2 id="push-content-title">Push 内容</h2><button class="button" id="close-push-content" type="button">关闭</button></div>
  <div class="body"><p id="push-content-notice" role="status" aria-live="polite"></p><pre id="push-content-text" tabindex="0"></pre></div>
</dialog>`;

export const pushPreviewStyle = String.raw`
#push-content-dialog { width: min(900px, calc(100vw - 32px)); max-height: 85vh; }
#push-content-text { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 60vh; overflow: auto; font: 13px/1.6 ui-monospace, monospace; }
`;

export const pushPreviewScript = String.raw`
let pushPreviewRequest = 0;
document.getElementById("close-push-content").addEventListener("click", () => document.getElementById("push-content-dialog").close());
document.getElementById("push-content-dialog").addEventListener("close", () => { pushPreviewRequest++; });
async function openPushPreview(item, load) {
  const requestID = ++pushPreviewRequest;
  const dialog = document.getElementById("push-content-dialog");
  const notice = document.getElementById("push-content-notice");
  const content = document.getElementById("push-content-text");
  document.getElementById("push-content-title").textContent = item.name || "Push 内容";
  content.textContent = ""; notice.textContent = "正在加载…";
  if (!dialog.open) dialog.showModal();
  try {
    const response = await load();
    const data = await response.json();
    if (requestID !== pushPreviewRequest) return;
    if (!response.ok) throw new Error(data.message || "无法加载内容。");
    content.textContent = data.content;
    notice.textContent = "提交时的内容 · " + (data.resource_type === "py" ? "Python" : "CMS");
  } catch(error) {
    if (requestID === pushPreviewRequest) notice.textContent = error.message || "无法加载内容，请稍后重试。";
  }
}
`;
