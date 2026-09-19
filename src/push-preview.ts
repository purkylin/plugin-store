export const pushPreviewDialog = String.raw`
<dialog id="push-content-dialog" aria-labelledby="push-content-title">
  <div class="card-head"><h2 id="push-content-title">Push 内容</h2><button class="button" id="close-push-content" type="button">关闭</button></div>
  <div class="body"><p id="push-content-notice" role="status" aria-live="polite"></p><pre id="push-content-text" tabindex="0"></pre></div>
</dialog>`;

export const pushPreviewStyle = String.raw`
#push-content-dialog { width: min(900px, calc(100vw - 32px)); max-height: 85vh; }
#push-content-text { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 60vh; overflow: auto; font: 13px/1.6 ui-monospace, monospace; }
#push-content-text .python-keyword { color: #78c7ff; }
#push-content-text .python-string { color: #8ce3bf; }
#push-content-text .python-comment { color: #718aa1; font-style: italic; }
#push-content-text .python-number { color: #f4bd76; }
#push-content-text .python-constant { color: #cf9cff; }
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
    content.innerHTML = data.resource_type === "py"
      ? highlightPushPython(data.content)
      : escapePushHTML(data.content);
    notice.textContent = "提交时的内容 · " + (data.resource_type === "py" ? "Python" : "CMS");
  } catch(error) {
    if (requestID === pushPreviewRequest) notice.textContent = error.message || "无法加载内容，请稍后重试。";
  }
}

function escapePushHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function highlightPushPython(source) {
  const keywords = new Set(["and","as","assert","async","await","break","case","class","continue","def","del","elif","else","except","finally","for","from","global","if","import","in","is","lambda","match","nonlocal","not","or","pass","raise","return","try","while","with","yield"]);
  const constants = new Set(["True","False","None","NotImplemented","Ellipsis"]);
  const tokenPattern = /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|#[^\r\n]*|\b[A-Za-z_]\w*\b|\b\d+(?:\.\d+)?\b)/g;
  let result = ""; let lastIndex = 0; let match;
  while ((match = tokenPattern.exec(source)) !== null) {
    result += escapePushHTML(source.slice(lastIndex, match.index));
    const token = match[0];
    const className = token.startsWith("#")
      ? "python-comment"
      : token.startsWith('"') || token.startsWith("'")
        ? "python-string"
        : constants.has(token)
          ? "python-constant"
          : keywords.has(token)
            ? "python-keyword"
            : /^\d/.test(token)
              ? "python-number"
              : "";
    result += className
      ? "<span class=\"" + className + "\">" + escapePushHTML(token) + "</span>"
      : escapePushHTML(token);
    lastIndex = tokenPattern.lastIndex;
  }
  return result + escapePushHTML(source.slice(lastIndex));
}
`;
