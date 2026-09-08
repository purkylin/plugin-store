import { pushPreviewDialog, pushPreviewScript, pushPreviewStyle } from "./push-preview";
const template = String.raw`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Hawk 插件投稿</title>
  <style nonce="__NONCE__">
    :root {
      --bg: #07111f; --panel: rgba(15,31,51,.88); --line: rgba(164,198,224,.16);
      --text: #ecf7ff; --muted: #91a9bb; --accent: #55d6be; --blue: #6ca9ff;
      --danger: #ff7d8d; --warning: #f4bd76; --shadow: 0 24px 70px rgba(0,0,0,.28);
    }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    body {
      margin: 0; min-height: 100vh; color: var(--text);
      background:
        radial-gradient(circle at 12% 4%, rgba(58,134,255,.18), transparent 34rem),
        radial-gradient(circle at 88% 12%, rgba(38,208,173,.13), transparent 30rem),
        var(--bg);
      font: 15px/1.55 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    }
    button,input,textarea,select { font: inherit; }
    button { cursor: pointer; }
    .shell { width: min(1080px,calc(100% - 40px)); margin: 0 auto; padding: 34px 0 64px; }
    header,.card-head,.actions,.user-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .actions { flex-wrap: wrap; }
    header { margin-bottom: 26px; }
    h1,h2,h3,p { margin: 0; }
    h1 { font-size: clamp(24px,3vw,32px); }
    h2 { font-size: 17px; }
    h3 { font-size: 14px; }
    .subtitle,.help { color: var(--muted); font-size: 12px; }
    .card {
      margin-bottom: 20px; border: 1px solid var(--line); border-radius: 20px;
      background: var(--panel); box-shadow: var(--shadow); overflow: hidden;
    }
    .card-head { padding: 18px 20px; border-bottom: 1px solid var(--line); }
    .body,form { padding: 20px; }
    .auth-grid,.row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    #auth-card { width: min(100%, 420px); margin-left: auto; margin-right: auto; }
    .auth-grid { grid-template-columns: minmax(0, 1fr); }
    .auth-panel { padding: 4px; }
    .switch-link { margin-top: 14px; color: var(--muted); font-size: 13px; }
    .switch-link a { color: var(--blue); }
    .login-actions { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .login-actions a { color: var(--blue); font-size: 13px; }
    .field { margin-bottom: 15px; }
    label { display: block; color: #c3d6e4; font-size: 12px; font-weight: 700; margin-bottom: 7px; }
    .required::after { content: " *"; color: var(--danger); font-weight: bold; }
    .input-group { display: flex; gap: 8px; align-items: center; }
    .input-group input { flex: 1; }
    .inspect-results { display: grid; gap: 10px; margin: 16px 0; padding: 14px; border: 1px solid var(--line); border-radius: 12px; background: rgba(2,10,19,.45); }
    .inspect-item { display: grid; grid-template-columns: 80px 1fr; gap: 10px; font-size: 13px; line-height: 1.5; }
    .inspect-label { color: var(--muted); font-weight: 500; }
    .inspect-val { color: var(--text); overflow-wrap: anywhere; }
    .inspect-desc { white-space: pre-wrap; }
    input,textarea,select {
      width: 100%; color: var(--text); border: 1px solid var(--line); border-radius: 11px;
      outline: none; background: rgba(2,10,19,.52); padding: 11px 12px;
    }
    input:focus,textarea:focus,select:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(108,169,255,.12); }
    input:disabled { color: #8ca3b5; cursor: not-allowed; background: rgba(2,10,19,.8); }
    textarea { min-height: 90px; resize: vertical; }
    .button {
      border: 1px solid var(--line); border-radius: 11px; padding: 9px 13px;
      color: var(--text); background: rgba(255,255,255,.045);
    }
    .button.primary { border-color: transparent; color: #06251f; font-weight: 750; background: linear-gradient(135deg,#7fe7d3,#50cbb4); }
    .button.danger { color: #ffc3cb; border-color: rgba(255,125,141,.3); background: rgba(255,125,141,.07); }
    .button:disabled { opacity: .45; cursor: not-allowed; }
    .notice { min-height: 22px; margin-top: 10px; color: var(--muted); font-size: 13px; }
    .auth-panel .notice:empty { display: none; }
    .notice.error { color: var(--danger); }
    .notice.ok { color: var(--accent); }
    .user-bar { flex-wrap: wrap; padding: 14px 20px; border-bottom: 1px solid var(--line); }
    .user-identity { display: flex; align-items: center; gap: 14px; min-width: 0; }
    .contribution-points { display: inline-flex; align-items: baseline; gap: 5px; padding: 5px 9px; border: 1px solid rgba(85,214,190,.24); border-radius: 999px; background: rgba(85,214,190,.08); white-space: nowrap; }
    .contribution-points strong { color: var(--accent); font-size: 15px; line-height: 1; }
    .contribution-points span { color: var(--muted); font-size: 11px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; min-width: 720px; border-collapse: collapse; }
    th,td { padding: 13px 20px; text-align: left; border-bottom: 1px solid var(--line); }
    th { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
    .badge { display: inline-flex; padding: 3px 8px; border-radius: 99px; font-size: 11px; }
    .pending { color: var(--warning); background: rgba(244,189,118,.12); }
    .accepted { color: var(--accent); background: rgba(85,214,190,.12); }
    .rejected { color: #ffc3cb; background: rgba(255,125,141,.12); }
    .cancelled { color: var(--muted); background: rgba(145,169,187,.12); }
    .draft { color: var(--blue); background: rgba(108,169,255,.12); }
    .private { color: #d4c6ff; background: rgba(156,126,255,.13); }
    .linked-plugin { margin-left: 6px; color: #a9d1ff; background: rgba(108,169,255,.16); }
    .submission-actions { display: grid; gap: 8px; justify-items: start; }
    .history { color: var(--muted); font-size: 12px; }
    .history summary { cursor: pointer; color: var(--blue); }
    .history ul { margin: 8px 0 0; padding-left: 18px; min-width: 250px; }
    .history li { margin: 5px 0; }
    .plugin-identity { display: flex; align-items: center; gap: 9px; min-width: 208px; }
    .plugin-name { font-weight: 700; }
    .plugin-id { color: var(--muted); font: 11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace; overflow-wrap: anywhere; }
    .market-dot { flex: 0 0 auto; width: 9px; height: 9px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 10px rgba(85,214,190,.75); }
    .plugin-status-icon { width: 18px; flex: 0 0 18px; display: flex; align-items: center; justify-content: center; }
    .private-lock { position: relative; width: 12px; height: 9px; margin-top: 4px; border-radius: 2px; background: #c6b4ff; }
    .private-lock::before { content: ""; position: absolute; left: 2px; top: -7px; width: 6px; height: 7px; border: 2px solid #c6b4ff; border-bottom: 0; border-radius: 6px 6px 0 0; }
    .menu-trigger { min-width: 38px; padding: 7px 10px; font-size: 18px; line-height: 1; letter-spacing: 2px; }
    .action-menu { position: fixed; z-index: 40; min-width: 176px; padding: 6px; border: 1px solid var(--line); border-radius: 13px; background: #102238; box-shadow: 0 18px 48px rgba(0,0,0,.38); }
    .menu-item { display: block; width: 100%; padding: 9px 11px; border: 0; border-radius: 8px; color: var(--text); background: transparent; text-align: left; }
    .menu-item:hover,.menu-item:focus-visible { outline: none; background: rgba(255,255,255,.07); }
    .menu-item.danger { color: #ffc3cb; }
    dialog {
      width: min(620px, calc(100% - 32px)); color: var(--text); border: 1px solid var(--line);
      border-radius: 20px; background: #0b1b2d; box-shadow: var(--shadow); padding: 0;
    }
    dialog::backdrop { background: rgba(2,8,15,.76); backdrop-filter: blur(8px); }
    .dialog-body { padding: 22px; }
    .dialog-meta { margin: 8px 0 16px; color: var(--muted); font-size: 13px; overflow-wrap: anywhere; }
    .dialog-history { max-height: 260px; overflow: auto; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; }
    .dialog-history ul { margin: 0; padding-left: 18px; }
    .dialog-history li { margin: 8px 0; }
    .dialog-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 18px; }
    .config-json { max-height: min(58vh,520px); overflow: auto; margin: 16px 0 0; padding: 16px; border: 1px solid var(--line); border-radius: 12px; color: #dcecff; background: rgba(2,10,19,.65); font: 12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
    .json-key { color: #78c7ff; }
    .json-string { color: #8ce3bf; }
    .json-number { color: #f4bd76; }
    .json-boolean { color: #cf9cff; }
    .json-null { color: #91a9bb; }
    #editor-dialog { width: min(900px, calc(100% - 32px)); max-height: calc(100vh - 32px); overflow: auto; }
    #editor-dialog .card { margin: 0; box-shadow: none; border: 0; }
    .empty { padding: 40px 20px; color: var(--muted); text-align: center; }
    .section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 18px 0 10px; }
    .custom-fields { display: grid; gap: 9px; }
    .custom-row { display: grid; grid-template-columns: minmax(120px,.8fr) 92px minmax(170px,1.2fr) auto; gap: 8px; }
    .custom-row input,.custom-row select { padding: 9px 10px; }
    .checks { display: flex; gap: 18px; }
    .checks label { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 14px; font-weight: 500; }
    .checks input { width: auto; accent-color: var(--accent); }
    .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
    .push-switch { display: flex; gap: 8px; margin-bottom: 16px; }
    .push-switch .button.active { color: #06251f; border-color: transparent; background: var(--accent); }
    .compact-table { min-width: 620px; }
    .portal-tabs { display: flex; gap: 6px; padding: 4px; border: 1px solid var(--line); border-radius: 12px; background: rgba(2,10,19,.38); }
    .portal-tab { border: 0; border-radius: 8px; padding: 8px 13px; color: var(--muted); background: transparent; }
    .portal-tab[aria-selected="true"] { color: var(--text); background: rgba(108,169,255,.16); }
    .toast { position: fixed; z-index: 80; right: 24px; bottom: 24px; max-width: min(420px, calc(100% - 48px)); padding: 12px 16px; border: 1px solid rgba(85,214,190,.35); border-radius: 12px; color: var(--text); background: #12352f; box-shadow: 0 16px 38px rgba(0,0,0,.35); opacity: 0; transform: translateY(12px); pointer-events: none; transition: opacity .18s ease, transform .18s ease; }
    .toast.visible { opacity: 1; transform: translateY(0); }
    .toast.error { border-color: rgba(255,125,141,.38); background: #3a1d2a; }
    @media (max-width: 760px) {
      .auth-grid,.row { grid-template-columns: 1fr; gap: 0; }
      .custom-row { grid-template-columns: 1fr 90px auto; }
      .custom-value { grid-column: 1 / -1; grid-row: 2; }
      header { align-items: flex-start; }
    }
    ${pushPreviewStyle}
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div><h1>Hawk 插件投稿</h1><p class="subtitle">提交插件，审核通过后自动上架插件市场</p></div>
    </header>

    <section class="card" id="auth-card">
      <div class="card-head"><div><h2>__AUTH_TITLE__</h2><p class="subtitle">__AUTH_SUBTITLE__</p></div></div>
      <div class="body auth-grid">
        <form class="auth-panel" id="login-form" __LOGIN_HIDDEN__>
          <h3>已有账号</h3>
          <div class="field"><label class="required" for="login-email">Email</label><input id="login-email" type="email" required></div>
          <div class="field"><label class="required" for="login-password">密码</label><input id="login-password" type="password" minlength="8" required></div>
          <div class="login-actions"><button class="button primary" type="submit">登录</button><a href="/forgot-password">忘记密码？</a></div>
          <p class="notice" id="login-notice"></p>
          <p class="switch-link">没有账号？<a href="/register">注册账号</a></p>
        </form>
        <form class="auth-panel" id="register-form" __REGISTER_HIDDEN__>
          <h3>注册账号</h3>
          <div class="field"><label class="required" for="register-email">Email</label><input id="register-email" type="email" required></div>
          <div class="field"><label class="required" for="register-nick">昵称 / Author</label><input id="register-nick" minlength="2" maxlength="40" required><span class="help">昵称全局唯一，并固定为插件 author。</span></div>
          <div class="field"><label class="required" for="register-password">密码</label><input id="register-password" type="password" minlength="8" maxlength="128" required></div>
          <div class="field"><label class="required" for="register-password-confirmation">确认密码</label><input id="register-password-confirmation" type="password" minlength="8" maxlength="128" required></div>
          <button class="button primary" type="submit">注册并发送激活邮件</button>
          <p class="notice" id="register-notice"></p>
          <p class="switch-link">已有账号？<a href="/login">返回登录</a></p>
        </form>
      </div>
    </section>

    <main id="portal" hidden>
      <section class="card">
        <div class="user-bar">
          <div class="user-identity"><div><strong id="user-nick"></strong><p class="subtitle" id="user-email"></p></div><div class="contribution-points" title="插件或 Push 首次通过 +1；私有插件和更新不计分"><strong id="contribution-points">0</strong><span>贡献值</span></div></div>
          <div class="actions">
            <div class="portal-tabs" role="tablist" aria-label="用户中心">
              <button class="portal-tab" id="portal-plugins-tab" type="button" role="tab" aria-selected="true">我的插件</button>
              <button class="portal-tab" id="portal-pushes-tab" type="button" role="tab" aria-selected="false">资源 Push</button>
            </div>
            <button class="button" id="logout" type="button">退出登录</button>
          </div>
        </div>
      </section>

      <section class="card" id="push-card" data-portal-page="pushes" hidden>
        <div class="card-head"><div><h2>Push 记录</h2><p class="subtitle">你提交的 Python 与 CMS 资源</p></div><button class="button primary" id="new-push" type="button" aria-label="新建 Push" title="新建 Push">＋</button></div>
        <div class="table-wrap"><table class="compact-table"><thead><tr><th>资源</th><th>类型</th><th>状态</th><th>提交时间</th><th>说明</th><th>操作</th></tr></thead><tbody id="push-rows"></tbody></table><div class="empty" id="push-empty">暂无 Push 记录</div></div>
      </section>
      <section class="card" data-portal-page="plugins">
        <div class="card-head"><div><h2>我的插件</h2><p class="subtitle">管理公开投稿和仅供手动导入的私有插件</p></div><div class="actions"><button class="button" id="refresh" type="button">刷新</button><button class="button" id="import-plugins" type="button">批量导入 JSON</button><input id="import-json-file" type="file" accept=".json,application/json" hidden><button class="button" id="submit-all-drafts" type="button" disabled>全部提交审核</button><button class="button primary" id="new-plugin" type="button">新建插件</button></div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>插件</th><th>提交版本</th><th>审核状态</th><th>提交时间</th><th>审核说明</th><th></th></tr></thead>
            <tbody id="submission-rows"></tbody>
          </table>
         <div class="empty" id="empty">暂无投稿记录</div>
        </div>
      </section>

      <dialog id="editor-dialog">
      <section class="card" id="editor-card">
        <div class="card-head"><div><h2 id="editor-title">新建插件</h2><p class="subtitle">提交后需等待管理员审核</p></div><button class="button" id="close-editor" type="button">关闭</button></div>
        <form id="plugin-form">
          <div class="field"><label>可见性</label><div class="checks"><label><input id="plugin-private" type="checkbox"> 私有插件</label></div><span class="help">仅可在创建时选择，之后不能更改。私有插件不会进入审核或市场，可复制配置后手动导入 App。</span></div>
          <div class="row">
            <div class="field" id="plugin-id-field"><label for="plugin-id">插件 ID</label><input id="plugin-id" disabled><span class="help">由系统自动生成，无法修改。</span></div>
            <div class="field"><label class="required" for="plugin-type">插件类型</label><select id="plugin-type" required><option value="hot">热榜（hot）</option></select></div>
          </div>
          <div class="row">
            <div class="field"><label class="required" for="plugin-name">名称</label><input id="plugin-name" required></div>
            <div class="field"><label for="plugin-author">Author</label><input id="plugin-author" disabled></div>
          </div>
          <div class="field"><label class="required" for="plugin-version">版本</label><input id="plugin-version" placeholder="例如 1.0.0" required><span class="help">更新已上架插件时必须使用更高版本。</span></div>
          <div class="field"><label for="plugin-icon">图标 URL</label><input id="plugin-icon" type="url" placeholder="例如 https://example.com/icon.png"></div>
          <div class="field">
            <label class="required" for="plugin-endpoint">数据源 URL</label>
            <div class="input-group">
              <input id="plugin-endpoint" type="url" placeholder="配置地址" required>
              <button class="button" id="inspect-endpoint" type="button" hidden>检查</button>
            </div>
          </div>
          <div class="field"><label class="required" for="plugin-desc">描述</label><textarea id="plugin-desc" required></textarea></div>
          <div class="section-head"><div><h3>自定义字段</h3><span class="help">支持文本、数字、布尔值和 JSON。</span></div><button class="button" id="add-field" type="button">添加字段</button></div>
          <div class="custom-fields" id="custom-fields"></div>
          <div class="field"><label>支持平台</label><div class="checks"><label><input id="platform-ios" type="checkbox" checked> iOS</label><label><input id="platform-tvos" type="checkbox" checked> tvOS</label></div></div>
          <div class="row">
            <div class="field"><label for="minimum-ios">最低 iOS App 版本</label><input id="minimum-ios" placeholder="例如 1.4.0"></div>
            <div class="field"><label for="minimum-tvos">最低 tvOS App 版本</label><input id="minimum-tvos" placeholder="例如 1.4.0"></div>
          </div>
          <div class="form-actions"><button class="button" id="cancel-editor" type="button">取消</button><button class="button" id="save-draft" type="button">保存草稿</button><button class="button primary" id="submit-plugin" type="submit">提交审核</button></div>
          <p class="notice" id="editor-notice"></p>
        </form>
      </section>
      </dialog>
    </main>
  </div>

  <div class="action-menu" id="plugin-action-menu" role="menu" hidden></div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <dialog id="push-dialog">
    <div class="dialog-body">
      <div class="card-head"><div><h2>新建资源 Push</h2><p class="subtitle">提交后由管理员处理</p></div><button class="button" id="close-push" type="button">关闭</button></div>
      <form id="push-form">
        <div class="push-switch"><button class="button active" id="push-type-py" type="button">Python</button><button class="button" id="push-type-cms" type="button">CMS</button></div>
        <div id="push-py-fields">
          <div class="field"><label>来源</label><select id="push-py-source"><option value="file">上传 .py 文件</option><option value="url">从 URL 获取</option></select></div>
          <div class="field" id="push-file-field"><label class="required" for="push-file">Python 文件</label><input id="push-file" type="file" accept=".py,text/x-python"><span class="help">支持中文、空格和括号，只需文件名以 .py 结尾。</span></div>
          <div class="field" id="push-url-field" hidden><label class="required" for="push-py-url">Python URL</label><input id="push-py-url" type="url" placeholder="https://example.com/script.py"><span class="help">提交时由服务器下载并保存内容，之后原地址变化不会影响本次审核。</span></div>
        </div>
        <div id="push-cms-fields" hidden><div class="row"><div class="field"><label class="required" for="push-cms-name">CMS 名称</label><input id="push-cms-name" maxlength="100"></div><div class="field"><label class="required" for="push-cms-url">CMS URL</label><input id="push-cms-url" type="url" placeholder="https://example.com/api.php/provide/vod/"></div></div></div>
        <div class="field"><label for="push-note">备注</label><textarea id="push-note" maxlength="500" placeholder="可选：补充来源、更新内容或注意事项"></textarea></div>
        <div class="checks"><label><input id="push-adult" type="checkbox"> 包含 🔞 内容</label></div>
        <div class="form-actions"><button class="button" id="cancel-push" type="button">取消</button><button class="button primary" id="push-submit" type="submit">提交 Push</button></div>
        <p class="notice" id="push-dialog-notice"></p>
      </form>
    </div>
  </dialog>
  <dialog id="config-dialog">
    <div class="dialog-body">
      <h2 id="config-title">插件配置</h2>
      <p class="dialog-meta">复制以下 JSON 后，可在 App 中手动导入。</p>
      <pre class="config-json" id="config-json"></pre>
      <p class="notice" id="config-notice"></p>
      <div class="dialog-actions">
        <button class="button" id="config-close" type="button">关闭</button>
        <button class="button primary" id="config-copy" type="button">复制配置</button>
      </div>
    </div>
  </dialog>
  <dialog id="inspect-dialog">
    <div class="dialog-body">
      <h2>发现插件信息</h2>
      <p class="dialog-meta">已成功解析音源插件脚本元数据，请确认是否填充到表单：</p>
      <div class="inspect-results">
        <div class="inspect-item"><span class="inspect-label">名称</span><span class="inspect-val" id="inspect-name"></span></div>
        <div class="inspect-item"><span class="inspect-label">版本</span><span class="inspect-val" id="inspect-version"></span></div>
        <div class="inspect-item"><span class="inspect-label">作者</span><span class="inspect-val" id="inspect-author"></span></div>
        <div class="inspect-item"><span class="inspect-label">支持平台</span><span class="inspect-val" id="inspect-platforms"></span></div>
        <div class="inspect-item"><span class="inspect-label">描述</span><span class="inspect-val inspect-desc" id="inspect-desc"></span></div>
      </div>
      <div class="dialog-actions">
        <button class="button" id="inspect-cancel" type="button">取消</button>
        <button class="button primary" id="inspect-fill" type="button">填充到表单</button>
      </div>
    </div>
  </dialog>
  ${pushPreviewDialog}
  <script nonce="__NONCE__">
    ${pushPreviewScript}
    const state = {
      user: null, submissions: [], pushes: [], pushType: "py", portalPage: "plugins", pluginTypes: [], editing: false, actionTrigger: null
    };
    const $ = (id) => document.getElementById(id);
    const known = new Set(["id","type","icon","name","author","version","update_time","desc","endpoint"]);

    $("login-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      await authenticate("/api/v1/auth/login", {
        email: $("login-email").value.trim(),
        password: $("login-password").value
      }, "login-notice");
    });
    $("register-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const password = $("register-password").value;
      const passwordConfirmation = $("register-password-confirmation").value;
      if (password !== passwordConfirmation) {
        showNotice("register-notice", "两次输入的密码不一致。", "error");
        $("register-password-confirmation").focus();
        return;
      }
      await authenticate("/api/v1/auth/register", {
        email: $("register-email").value.trim(),
        nick: $("register-nick").value.trim(),
        password,
        password_confirmation: passwordConfirmation
      }, "register-notice");
    });
    $("logout").addEventListener("click", async () => {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "same-origin"
      });
      state.user = null; state.submissions = [];
      $("portal").hidden = true; $("auth-card").hidden = false;
    });
    $("refresh").addEventListener("click", loadPortalData);
    $("portal-plugins-tab").addEventListener("click", () => switchPortalPage("plugins"));
    $("portal-pushes-tab").addEventListener("click", () => switchPortalPage("pushes"));
    $("push-type-py").addEventListener("click", () => setPushType("py"));
    $("push-type-cms").addEventListener("click", () => setPushType("cms"));
    $("push-py-source").addEventListener("change", updatePushSource);
    $("push-form").addEventListener("submit", submitPush);
    $("new-push").addEventListener("click", openPushDialog);
    $("close-push").addEventListener("click", closePushDialog);
    $("cancel-push").addEventListener("click", closePushDialog);
    $("new-plugin").addEventListener("click", newPlugin);
    $("import-plugins").addEventListener("click", () => $("import-json-file").click());
    $("import-json-file").addEventListener("change", importPlugins);
    $("submit-all-drafts").addEventListener("click", submitAllDrafts);
    $("close-editor").addEventListener("click", closeEditor);
    $("cancel-editor").addEventListener("click", closeEditor);
    $("add-field").addEventListener("click", () => addCustomField("", ""));
    $("plugin-form").addEventListener("submit", submitPlugin);
    $("save-draft").addEventListener("click", saveDraft);
    $("plugin-private").addEventListener("change", updateVisibilityControls);
    $("plugin-type").addEventListener("change", updateInspectButtonVisibility);
    $("inspect-endpoint").addEventListener("click", inspectEndpoint);
    $("inspect-cancel").addEventListener("click", () => {
      if ($("inspect-dialog").open) $("inspect-dialog").close();
    });
    $("inspect-fill").addEventListener("click", fillFromInspection);
    $("config-close").addEventListener("click", closePluginConfig);
    $("config-copy").addEventListener("click", copyPluginConfig);
    document.addEventListener("click", (event) => {
      const menu = $("plugin-action-menu");
      if (!menu.hidden && !menu.contains(event.target) && event.target !== state.actionTrigger) {
        closePluginMenu();
      }
    });
    window.addEventListener("resize", closePluginMenu);
    window.addEventListener("scroll", closePluginMenu, true);
    restoreSession();

    async function authenticate(path, body, noticeID) {
      showNotice(noticeID, "", "");
      const button = $(noticeID).closest("form").querySelector('button[type="submit"]');
      if (button.disabled) return;
      button.disabled = true;
      let waitingForResend = false;
      try {
        const response = await fetch(path, {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        });
        if (!response.ok) throw await responseError(response);
        const result = await response.json();
        if (result.verification_required) {
          showNotice(noticeID, result.message, "ok");
          waitingForResend = true;
          let seconds = 60;
          button.textContent = seconds + " 秒后可重新发送";
          const timer = setInterval(() => {
            seconds--;
            button.textContent = seconds + " 秒后可重新发送";
            if (seconds <= 0) { clearInterval(timer); button.disabled = false; button.textContent = "重新发送激活邮件"; }
          }, 1000);
          return;
        }
        showPortal(result.user);
        await loadPortalData();
      } catch (error) {
        showNotice(noticeID, error.message, "error");
      } finally {
        if (!waitingForResend) button.disabled = false;
      }
    }

    async function restoreSession() {
      const response = await fetch("/api/v1/user/me", {
        credentials: "same-origin"
      });
      if (!response.ok) return;
      const result = await response.json();
      showPortal(result.user);
      await loadPortalData();
    }

    function showPortal(user) {
      state.user = user;
      $("auth-card").hidden = true; $("portal").hidden = false;
      updateUserSummary(user);
      switchPortalPage(state.portalPage);
    }

    function updateUserSummary(user) {
      $("user-nick").textContent = user.nick;
      $("user-email").textContent = user.email;
      $("contribution-points").textContent = new Intl.NumberFormat().format(user.contribution_points ?? 0);
    }

    function switchPortalPage(page) {
      state.portalPage = page;
      document.querySelectorAll("[data-portal-page]").forEach((section) => {
        section.hidden = section.dataset.portalPage !== page;
      });
      $("portal-plugins-tab").setAttribute("aria-selected", page === "plugins" ? "true" : "false");
      $("portal-pushes-tab").setAttribute("aria-selected", page === "pushes" ? "true" : "false");
    }

    async function loadPortalData() {
      await Promise.all([loadSubmissions(), loadPushes(), loadPluginTypes(), loadCurrentUser()]);
    }

    async function loadCurrentUser() {
      const response = await fetch("/api/v1/user/me", { credentials: "same-origin" });
      if (!response.ok) throw await responseError(response);
      const result = await response.json();
      state.user = result.user;
      updateUserSummary(result.user);
    }

    function setPushType(type) {
      state.pushType = type;
      $("push-py-fields").hidden = type !== "py";
      $("push-cms-fields").hidden = type !== "cms";
      $("push-type-py").classList.toggle("active", type === "py");
      $("push-type-cms").classList.toggle("active", type === "cms");
    }

    function updatePushSource() {
      const file = $("push-py-source").value === "file";
      $("push-file-field").hidden = !file;
      $("push-url-field").hidden = file;
    }

    function openPushDialog() {
      showNotice("push-dialog-notice", "", "");
      $("push-dialog").showModal();
    }

    function closePushDialog() {
      if ($("push-dialog").open) $("push-dialog").close();
    }

    async function submitPush(event) {
      event.preventDefault();
      const button = $("push-submit");
      button.disabled = true;
      showNotice("push-dialog-notice", "正在提交…", "");
      try {
        let response;
        if (state.pushType === "py") {
          const form = new FormData();
          if ($("push-py-source").value === "file") {
            const file = $("push-file").files[0];
            if (!file) throw new Error("请选择一个 .py 文件。");
            form.append("file", file);
          } else {
            const url = $("push-py-url").value.trim();
            if (!url) throw new Error("请填写 Python URL。");
            form.append("url", url);
          }
          form.append("note", $("push-note").value.trim());
          form.append("is_adult", $("push-adult").checked ? "true" : "false");
          response = await fetch("/api/v1/user/pushes/py", { method: "POST", credentials: "same-origin", body: form });
        } else {
          const name = $("push-cms-name").value.trim();
          const url = $("push-cms-url").value.trim();
          if (!name || !url) throw new Error("请填写 CMS 名称和 URL。");
          response = await fetch("/api/v1/user/pushes/cms", {
            method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
            body: JSON.stringify({ name, url, note: $("push-note").value.trim() || null, is_adult: $("push-adult").checked })
          });
        }
        if (!response.ok) throw await responseError(response);
        $("push-form").reset(); setPushType(state.pushType); updatePushSource();
        await loadPushes();
        await loadCurrentUser();
        closePushDialog();
        showNotice("push-notice", "Push 已提交，处理结果会显示在记录中并通过邮件通知。", "ok");
      } catch (error) {
        showNotice("push-dialog-notice", error.message, "error");
      } finally { button.disabled = false; }
    }

    async function loadPushes() {
      const response = await fetch("/api/v1/user/pushes?page=1&page_size=100", { credentials: "same-origin" });
      if (!response.ok) throw await responseError(response);
      state.pushes = (await response.json()).items;
      renderPushRows($("push-rows"), state.pushes);
      $("push-empty").hidden = state.pushes.length > 0;
    }

    function renderPushRows(tbody, items) {
      tbody.replaceChildren();
      const labels = { pending: "待处理", accepted: "已接受", rejected: "已拒绝" };
      for (const item of items) {
        const badge = document.createElement("span"); badge.className = "badge " + item.status; badge.textContent = labels[item.status] || item.status;
        const note = item.rejection_reason || item.review_note || item.user_note || "—";
        const row = document.createElement("tr");
        row.append(cell(item.name || "—"), cell(item.resource_type === "py" ? "Python" : "CMS"), cell(badge), cell(new Date(item.pushed_at).toLocaleString()), cell(note));
        const view = document.createElement("button"); view.className = "button"; view.type = "button"; view.textContent = "查看内容";
        view.addEventListener("click", () => openPushPreview(item, () => fetch("/api/v1/user/pushes/" + encodeURIComponent(item.id) + "/content", { credentials: "same-origin" })));
        row.append(cell(view));
        tbody.append(row);
      }
    }

    async function loadPluginTypes() {
      const response = await fetch("/api/v1/plugin-types", { credentials: "same-origin" });
      if (!response.ok) throw await responseError(response);
      state.pluginTypes = (await response.json()).items;
      renderPluginTypeOptions($("plugin-type").value);
    }

    function renderPluginTypeOptions(selected) {
      const select = $("plugin-type");
      select.replaceChildren();
      for (const type of state.pluginTypes) {
        const option = document.createElement("option");
        option.value = type.value;
        option.textContent = type.name + "（" + type.value + "）";
        select.append(option);
      }
      if (selected && state.pluginTypes.some((type) => type.value === selected)) {
        select.value = selected;
      } else if (state.pluginTypes.length > 0) {
        select.value = state.pluginTypes[0].value;
      }
      if (!select.options.length) {
        const empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "暂无可用类型";
        empty.disabled = true;
        empty.selected = true;
        select.append(empty);
      }
      updateInspectButtonVisibility();
    }

    async function loadSubmissions() {
      try {
        const response = await fetch("/api/v1/user/submissions", {
          credentials: "same-origin"
        });
        if (!response.ok) throw await responseError(response);
        state.submissions = (await response.json()).items;
        const draftCount = state.submissions.filter((item) => item.status === "draft").length;
        const action = state.user.whitelisted ? "全部发布" : "全部提交审核";
        $("submit-all-drafts").disabled = draftCount === 0;
        $("submit-all-drafts").textContent = draftCount
          ? action + " (" + draftCount + ")"
          : action;
        renderSubmissions();
      } catch (error) {
        showNotice("editor-notice", error.message, "error");
      }
    }

    async function submitAllDrafts() {
      const draftCount = state.submissions.filter((item) => item.status === "draft").length;
      if (!draftCount || !confirm(
        state.user.whitelisted
          ? "确定直接发布全部 " + draftCount + " 个草稿？"
          : "确定将全部 " + draftCount + " 个草稿提交管理员审核？"
      )) return;
      const button = $("submit-all-drafts");
      button.disabled = true;
      showNotice("submission-notice", "正在提交全部草稿…", "");
      try {
        const response = await fetch("/api/v1/user/plugins/submit-drafts", {
          method: "POST",
          credentials: "same-origin"
        });
        if (!response.ok) throw await responseError(response);
        const result = await response.json();
        await loadSubmissions();
        await loadCurrentUser();
        showNotice(
          "submission-notice",
          result.published_count !== undefined
            ? "已直接上架 " + result.published_count + " 个插件。"
            : "已提交 " + result.submitted_count + " 个插件，正在等待管理员审核。",
          "ok"
        );
      } catch (error) {
        showNotice("submission-notice", error.message, "error");
        button.disabled = false;
      }
    }

    async function importPlugins(event) {
      const input = event.currentTarget;
      const file = input.files && input.files[0];
      if (!file) return;
      const button = $("import-plugins");
      button.disabled = true;
      showNotice("submission-notice", "正在导入并校验 JSON…", "");
      try {
        const parsed = JSON.parse(await file.text());
        const plugins = Array.isArray(parsed) ? parsed : parsed && parsed.plugins;
        if (!Array.isArray(plugins) || plugins.length < 1 || plugins.length > 100) {
          throw new Error("JSON 必须是包含 1–100 个插件的数组，或包含 plugins 数组的对象。");
        }
        const response = await fetch("/api/v1/user/plugins/import", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ plugins })
        });
        if (!response.ok) throw await responseError(response);
        const result = await response.json();
        await loadSubmissions();
        showNotice(
          "submission-notice",
          "成功导入 " + result.imported_count + " 个插件，均已保存为草稿。",
          "ok"
        );
      } catch (error) {
        showNotice(
          "submission-notice",
          error instanceof SyntaxError ? "JSON 文件格式错误。" : error.message,
          "error"
        );
      } finally {
        input.value = "";
        button.disabled = false;
      }
    }

    function renderSubmissions() {
      closePluginMenu();
      const tbody = $("submission-rows");
      tbody.replaceChildren();
      $("empty").hidden = state.submissions.length > 0;
      for (const item of state.submissions) {
        const row = document.createElement("tr");
        const identity = document.createElement("div");
        identity.className = "plugin-identity";
        const iconSlot = document.createElement("span");
        iconSlot.className = "plugin-status-icon";
        if (item.visibility === "private") {
          const lock = document.createElement("span");
          lock.className = "private-lock";
          lock.title = "私有插件";
          lock.setAttribute("aria-label", "私有插件");
          iconSlot.append(lock);
        } else if (item.published_version) {
          const dot = document.createElement("span");
          dot.className = "market-dot";
          dot.title = "已有版本上架";
          dot.setAttribute("aria-label", "已有版本上架");
          iconSlot.append(dot);
        }
        identity.append(iconSlot);
        const identityText = document.createElement("div");
        const name = document.createElement("div");
        name.className = "plugin-name";
        name.textContent = item.manifest.name;
        const id = document.createElement("div");
        id.className = "plugin-id";
        id.textContent = item.plugin_id;
        identityText.append(name, id);
        identity.append(identityText);
        row.append(cell(identity));
        row.append(cell(item.version));
        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = "badge " + item.status;
        badge.textContent = {
          pending: "待审核",
          accepted: "已接受",
          rejected: "已拒绝",
          cancelled: "已取消",
          draft: "草稿",
          private: "私有"
        }[item.status];
        statusCell.append(badge);
        if (item.linked) {
          const linked = document.createElement("span");
          linked.className = "badge linked-plugin";
          linked.textContent = "已关联";
          linked.title = "后台配置已关联此插件，自动更新会同步并覆盖公开草稿";
          statusCell.append(linked);
        }
        row.append(statusCell);
        row.append(cell(new Date(item.submitted_at).toLocaleString()));
        row.append(cell(item.rejection_reason || "—"));
        const action = document.createElement("td");
        const more = document.createElement("button");
        more.className = "button menu-trigger";
        more.type = "button";
        more.textContent = "•••";
        more.title = "插件菜单";
        more.setAttribute("aria-label", item.manifest.name + " 插件菜单");
        more.setAttribute("aria-haspopup", "menu");
        more.setAttribute("aria-expanded", "false");
        more.addEventListener("click", (event) => {
          event.stopPropagation();
          openPluginMenu(item, more);
        });
        action.append(more);
        row.append(action); tbody.append(row);
      }
    }

    function openPluginMenu(item, trigger) {
      const menu = $("plugin-action-menu");
      if (!menu.hidden && state.actionTrigger === trigger) {
        closePluginMenu();
        return;
      }
      closePluginMenu();
      state.actionTrigger = trigger;
      trigger.setAttribute("aria-expanded", "true");
      menu.replaceChildren();
      const addAction = (label, action, danger = false) => {
        const button = document.createElement("button");
        button.className = "menu-item" + (danger ? " danger" : "");
        button.type = "button";
        button.role = "menuitem";
        button.textContent = label;
        button.addEventListener("click", () => {
          closePluginMenu();
          action(button);
        });
        menu.append(button);
      };
      const typeConfigured = state.pluginTypes.some(
        (type) => type.value === item.manifest.type
      );
      if (item.status !== "pending" && typeConfigured) {
        addAction({
          accepted: "编辑",
          rejected: "修改后提交",
          cancelled: "继续编辑",
          draft: "编辑草稿",
          private: "编辑私有插件"
        }[item.status] || "编辑", () => editSubmission(item));
      }
      addAction("查看配置", () => showPluginConfig(item));
      if (typeConfigured) addAction("用作模板", () => useAsTemplate(item));
      if (item.status === "pending") {
        addAction("取消审核", (button) => cancelSubmission(item, button));
      }
      if (item.published_version) {
        addAction("下架", (button) => unpublishPlugin(item, button));
      }
      addAction("删除插件", (button) => deletePlugin(item, button), true);
      menu.hidden = false;
      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      menu.style.left = Math.max(
        8,
        Math.min(triggerRect.right - menuRect.width, window.innerWidth - menuRect.width - 8)
      ) + "px";
      menu.style.top = Math.max(
        8,
        Math.min(triggerRect.bottom + 6, window.innerHeight - menuRect.height - 8)
      ) + "px";
    }

    function showPluginConfig(item) {
      $("config-title").textContent = item.manifest.name + " · 插件配置";
      $("config-json").innerHTML = highlightJSON(JSON.stringify(item.manifest, null, 2));
      showNotice("config-notice", "", "");
      $("config-copy").disabled = false;
      $("config-copy").textContent = "复制配置";
      $("config-dialog").showModal();
    }

    function closePluginConfig() {
      $("config-dialog").close();
    }

    async function copyPluginConfig() {
      const button = $("config-copy");
      try {
        await navigator.clipboard.writeText($("config-json").textContent);
        button.textContent = "已复制";
        showNotice("config-notice", "配置已复制，可前往 App 手动导入。", "ok");
      } catch {
        showNotice("config-notice", "复制失败，请手动选择上方 JSON。", "error");
      }
    }

    function highlightJSON(json) {
      const escaped = json
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
      return escaped.replace(
        /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g,
        (token) => {
          let kind = "number";
          if (token.startsWith('"')) kind = token.endsWith(":") ? "key" : "string";
          else if (token === "true" || token === "false") kind = "boolean";
          else if (token === "null") kind = "null";
          return '<span class="json-' + kind + '">' + token + "</span>";
        }
      );
    }

    function closePluginMenu() {
      if (state.actionTrigger) state.actionTrigger.setAttribute("aria-expanded", "false");
      state.actionTrigger = null;
      $("plugin-action-menu").hidden = true;
    }

    async function deletePlugin(item, button) {
      if (!confirm(
        "确定永久删除 " + item.manifest.name
        + "？所有版本、投稿和审核记录都会删除，此操作无法撤销。"
      )) return;
      button.disabled = true;
      showNotice("submission-notice", "", "");
      try {
        const response = await fetch(
          "/api/v1/user/plugins/" + encodeURIComponent(item.plugin_id),
          { method: "DELETE", credentials: "same-origin" }
        );
        if (!response.ok) throw await responseError(response);
        await loadSubmissions();
        showNotice("submission-notice", "插件及其历史记录已删除。", "ok");
      } catch (error) {
        showNotice("submission-notice", error.message, "error");
        button.disabled = false;
      }
    }

    async function unpublishPlugin(item, button) {
      if (!confirm("确定将 " + item.manifest.name + " 从插件市场下架？")) return;
      button.disabled = true;
      showNotice("submission-notice", "", "");
      try {
        const response = await fetch(
          "/api/v1/user/plugins/" + encodeURIComponent(item.plugin_id) + "/unpublish",
          { method: "POST", credentials: "same-origin" }
        );
        if (!response.ok) throw await responseError(response);
        await loadSubmissions();
        showNotice("submission-notice", "插件已下架，审核与版本记录仍然保留。", "ok");
      } catch (error) {
        showNotice("submission-notice", error.message, "error");
        button.disabled = false;
      }
    }

    async function cancelSubmission(item, button) {
      if (!confirm("确定取消 " + item.manifest.name + " 的审核投稿？")) return;
      button.disabled = true;
      showNotice("submission-notice", "", "");
      try {
        const response = await fetch(
          "/api/v1/user/submissions/" + encodeURIComponent(item.id) + "/cancel",
          { method: "POST", credentials: "same-origin" }
        );
        if (!response.ok) throw await responseError(response);
        await loadSubmissions();
        showNotice("submission-notice", "投稿已取消，现在可以继续编辑。", "ok");
      } catch (error) {
        showNotice("submission-notice", error.message, "error");
        button.disabled = false;
      }
    }

    let currentInspectData = null;

    function isLuexueType(val) {
      const v = String(val || "").toLowerCase();
      return (
        v === "luoxue" ||
        v === "luexue" ||
        v === "lx" ||
        v.includes("luoxue") ||
        v.includes("luexue") ||
        v.includes("洛雪") ||
        v.includes("六雪") ||
        v.includes("音源")
      );
    }

    function updateInspectButtonVisibility() {
      const type = $("plugin-type").value;
      $("inspect-endpoint").hidden = !isLuexueType(type);
    }

    const KNOWN_PLATFORMS_CLIENT = {
      wy: "网易云音乐",
      "163": "网易云音乐",
      netease: "网易云音乐",
      tx: "QQ音乐",
      qq: "QQ音乐",
      tencent: "QQ音乐",
      kw: "酷我音乐",
      kuwo: "酷我音乐",
      kg: "酷狗音乐",
      kugou: "酷狗音乐",
      mg: "咪咕音乐",
      migu: "咪咕音乐",
      xm: "虾米音乐",
      xiami: "虾米音乐",
      bd: "百度音乐",
      baidu: "百度音乐",
      qsvip: "汽水VIP",
      qishui: "汽水音乐",
    };

    function runScriptInBrowserSandbox(scriptContent) {
      if (!scriptContent) return Promise.resolve(null);
      return new Promise((resolve) => {
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.setAttribute("sandbox", "allow-scripts");

        const timer = setTimeout(() => {
          cleanup();
          resolve(null);
        }, 1500);

        function cleanup() {
          clearTimeout(timer);
          window.removeEventListener("message", onMessage);
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }

        function onMessage(event) {
          if (event.data && event.data.type === "LX_SOURCES_INITED") {
            cleanup();
            resolve(event.data.sources);
          }
        }

        window.addEventListener("message", onMessage);

        const safeCode = (scriptContent || "").replace(new RegExp("<" + "/script", "gi"), "<\\/script");
        const runnerHtml = "<!DOCTYPE html><html><head><scr" + "ipt nonce=\"__NONCE__\">" +
          "(function() {" +
          "  var EVENT_NAMES = Object.freeze({" +
          "    inited: 'inited'," +
          "    request: 'request'," +
          "    musicUrl: 'musicUrl'," +
          "    musicSearch: 'musicSearch'," +
          "    lyric: 'lyric'," +
          "    pic: 'pic'," +
          "    songList: 'songList'" +
          "  });" +
          "  var lx = {" +
          "    EVENT_NAMES: EVENT_NAMES," +
          "    version: '2.0.0'," +
          "    env: 'mobile'," +
          "    currentScriptInfo: {}," +
          "    send: function(event, data) {" +
          "      if ((event === 'inited' || event === EVENT_NAMES.inited) && data && data.sources) {" +
          "        try {" +
          "          parent.postMessage({ type: 'LX_SOURCES_INITED', sources: data.sources }, '*');" +
          "        } catch(e) {}" +
          "      }" +
          "    }," +
          "    on: function() {}," +
          "    request: function(url, opt, cb) {" +
          "      if (typeof opt === 'function') { cb = opt; opt = {}; }" +
          "      if (typeof cb === 'function') {" +
          "        try { cb(null, { statusCode: 200, body: '{}' }, '{}'); } catch(e){}" +
          "      }" +
          "    }," +
          "    utils: {" +
          "      buffer: {" +
          "        from: function(str) { return { toString: function() { return String(str); } }; }" +
          "      }" +
          "    }" +
          "  };" +
          "  window.lx = lx;" +
          "  globalThis.lx = lx;" +
          "  window.EVENT_NAMES = EVENT_NAMES;" +
          "  window.send = lx.send;" +
          "  window.on = lx.on;" +
          "  window.request = lx.request;" +
          "  try {" +
          "    " + safeCode + "\n" +
          "  } catch (e) {}" +
          "})();" +
          "<" + "/scr" + "ipt></head><body></body></html>";

        iframe.srcdoc = runnerHtml;
        document.body.appendChild(iframe);
      });
    }

    async function inspectEndpoint() {
      const endpoint = $("plugin-endpoint").value.trim();
      if (!endpoint) {
        showNotice("editor-notice", "请先输入数据源 URL 后再进行检查。", "error");
        $("plugin-endpoint").focus();
        return;
      }
      const btn = $("inspect-endpoint");
      btn.disabled = true;
      btn.textContent = "检查中…";
      showNotice("editor-notice", "", "");
      try {
        const response = await fetch("/api/v1/plugins/inspect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: endpoint })
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.message || "检查脚本失败 (" + response.status + ")");
        }
        const data = await response.json();

        // Dynamically capture sources via sandboxed browser execution
        if (data.script_content) {
          try {
            const browserSources = await runScriptInBrowserSandbox(data.script_content);
            if (browserSources && typeof browserSources === "object") {
              const clientPlatforms = [];
              for (const [key, val] of Object.entries(browserSources)) {
                let pName = null;
                if (val && typeof val === "object" && typeof val.name === "string") {
                  pName = val.name.trim();
                } else if (typeof val === "string") {
                  pName = val.trim();
                }
                if (!pName || pName === key + "音乐" || pName.toLowerCase() === key.toLowerCase()) {
                  pName = KNOWN_PLATFORMS_CLIENT[key.toLowerCase()] || pName || key;
                }
                pName = pName || KNOWN_PLATFORMS_CLIENT[key.toLowerCase()] || key;
                if (!clientPlatforms.includes(pName)) {
                  clientPlatforms.push(pName);
                }
              }
              if (clientPlatforms.length > 0) {
                data.platforms = clientPlatforms;
              }
            }
          } catch {}
        }

        currentInspectData = data;
        $("inspect-name").textContent = data.name || "未提供";
        $("inspect-version").textContent = data.version || "未提供";
        $("inspect-author").textContent = data.author || "未提供";
        $("inspect-platforms").textContent = data.platforms && data.platforms.length ? data.platforms.join("、") : "未检测到特定平台";
        $("inspect-desc").textContent = data.description || "未提供";
        $("inspect-dialog").showModal();
      } catch (error) {
        showNotice("editor-notice", "检查失败：" + (error && error.message ? error.message : String(error)), "error");
      } finally {
        btn.disabled = false;
        btn.textContent = "检查";
      }
    }

    function fillFromInspection() {
      if (currentInspectData) {
        if (currentInspectData.name) {
          $("plugin-name").value = currentInspectData.name;
        }
        if (currentInspectData.version) {
          $("plugin-version").value = currentInspectData.version;
        }
        let fullDesc = "";
        if (currentInspectData.platforms && currentInspectData.platforms.length) {
          fullDesc += "支持平台：" + currentInspectData.platforms.join("、");
        }
        if (currentInspectData.description) {
          fullDesc += (fullDesc ? "\n" : "") + currentInspectData.description;
        }
        if (fullDesc) {
          $("plugin-desc").value = fullDesc;
        }
        showNotice("editor-notice", "已将脚本信息填充至表单。", "ok");
      }
      if ($("inspect-dialog").open) $("inspect-dialog").close();
    }

    function newPlugin() {
      state.editing = false;
      const defaultType = state.pluginTypes[0]?.value || "";
      populate({
        type: defaultType, name: "Example Plugin",
        author: state.user.nick, version: "1.0.0", desc: "Plugin description",
        endpoint: ""
      });
      $("plugin-id-field").hidden = true;
      $("plugin-type").disabled = false;
      $("editor-title").textContent = "新建插件";
      $("minimum-ios").value = ""; $("minimum-tvos").value = "";
      $("platform-ios").checked = true; $("platform-tvos").checked = true;
      $("plugin-private").checked = false;
      updateVisibilityControls();
      updateInspectButtonVisibility();
      openEditor();
    }

    function useAsTemplate(item) {
      state.editing = false;
      const manifest = { ...item.manifest };
      delete manifest.id;
      delete manifest.author;
      delete manifest.update_time;
      populate(manifest);
      $("plugin-id-field").hidden = true;
      $("plugin-type").disabled = false;
      $("editor-title").textContent = "以 " + item.manifest.name + " 为模板新建";
      $("minimum-ios").value = item.minimum_ios_version || "";
      $("minimum-tvos").value = item.minimum_tvos_version || "";
      $("platform-ios").checked = item.platforms.includes("ios");
      $("platform-tvos").checked = item.platforms.includes("tvos");
      $("plugin-private").checked = item.visibility === "private";
      updateVisibilityControls();
      openEditor();
    }

    function editSubmission(item) {
      state.editing = true;
      populate(item.manifest);
      $("plugin-id-field").hidden = false;
      $("plugin-type").disabled = true;
      $("editor-title").textContent = {
        accepted: "编辑 ",
        rejected: "修改后提交 ",
        cancelled: "继续编辑 ",
        draft: "编辑草稿 ",
        private: "编辑私有插件 "
      }[item.status] + item.manifest.name;
      $("minimum-ios").value = item.minimum_ios_version || "";
      $("minimum-tvos").value = item.minimum_tvos_version || "";
      $("platform-ios").checked = item.platforms.includes("ios");
      $("platform-tvos").checked = item.platforms.includes("tvos");
      $("plugin-private").checked = item.visibility === "private";
      updateVisibilityControls();
      openEditor();
    }

    function updateVisibilityControls() {
      const isPrivate = $("plugin-private").checked;
      $("plugin-private").disabled = state.editing;
      $("plugin-private").title = state.editing ? "可见性在插件创建后不能更改" : "";
      $("submit-plugin").hidden = isPrivate;
      $("submit-plugin").disabled = isPrivate;
      $("submit-plugin").title = isPrivate ? "私有插件不能提交审核" : "";
      $("save-draft").textContent = isPrivate ? "保存插件" : "保存草稿";
      $("editor-title").nextElementSibling.textContent = isPrivate
        ? "私有插件可保存和复制配置，但不能提交审核；创建后不可改为公开"
        : state.editing
          ? "插件可见性在创建后不能更改"
        : "提交后需等待管理员审核";
    }

    function openEditor() {
      showNotice("editor-notice", "", "");
      $("editor-dialog").showModal();
    }
    function closeEditor() {
      if ($("editor-dialog").open) $("editor-dialog").close();
    }

    function populate(manifest) {
      $("plugin-id").value = text(manifest.id);
      renderPluginTypeOptions(text(manifest.type));
      $("plugin-name").value = text(manifest.name);
      $("plugin-author").value = state.user.nick;
      $("plugin-version").value = text(manifest.version);
      $("plugin-icon").value = text(manifest.icon);
      $("plugin-endpoint").value = text(manifest.endpoint);
      $("plugin-desc").value = text(manifest.desc);
      $("custom-fields").replaceChildren();
      for (const [key, value] of Object.entries(manifest)) {
        if (!known.has(key)) addCustomField(key, value);
      }
      updateCustomEmpty();
      updateInspectButtonVisibility();
    }

    async function submitPlugin(event) {
      event.preventDefault();
      let manifest;
      try { manifest = readManifest(); }
      catch (error) { return showNotice("editor-notice", error.message, "error"); }
      const platforms = [
        ...($("platform-ios").checked ? ["ios"] : []),
        ...($("platform-tvos").checked ? ["tvos"] : [])
      ];
      if (!platforms.length) return showNotice("editor-notice", "至少选择一个平台。", "error");
      $("submit-plugin").disabled = true;
      try {
        const path = state.editing
          ? "/api/v1/user/plugins/" + encodeURIComponent(manifest.id)
          : "/api/v1/user/plugins";
        const response = await fetch(
          path,
          {
            method: state.editing ? "PUT" : "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              manifest, platforms,
              visibility: $("plugin-private").checked ? "private" : "public",
              minimum_ios_version: $("minimum-ios").value.trim() || null,
              minimum_tvos_version: $("minimum-tvos").value.trim() || null
            })
          }
        );
        if (!response.ok) throw await responseError(response);
        const result = await response.json();
        await loadSubmissions();
        await loadCurrentUser();
        closeEditor();
        showNotice(
          "submission-notice",
          result.status === "accepted"
            ? "提交成功，插件已直接上架。"
            : "提交成功，插件正在等待管理员审核。",
          "ok"
        );
      } catch (error) {
        showNotice("editor-notice", error.message, "error");
      } finally {
        updateVisibilityControls();
      }
    }

    async function saveDraft() {
      if (!$("plugin-form").reportValidity()) return;
      let manifest;
      try { manifest = readManifest(); }
      catch (error) { return showNotice("editor-notice", error.message, "error"); }
      const platforms = [
        ...($("platform-ios").checked ? ["ios"] : []),
        ...($("platform-tvos").checked ? ["tvos"] : [])
      ];
      if (!platforms.length) return showNotice("editor-notice", "至少选择一个平台。", "error");
      const path = state.editing
        ? "/api/v1/user/plugins/" + encodeURIComponent(manifest.id) + "/draft"
        : "/api/v1/user/plugins/draft";
      $("save-draft").disabled = true;
      try {
        const response = await fetch(path, {
          method: state.editing ? "PUT" : "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            manifest, platforms,
            visibility: $("plugin-private").checked ? "private" : "public",
            minimum_ios_version: $("minimum-ios").value.trim() || null,
            minimum_tvos_version: $("minimum-tvos").value.trim() || null
          })
        });
        if (!response.ok) throw await responseError(response);
        closeEditor();
        await loadSubmissions();
        showNotice(
          "submission-notice",
          $("plugin-private").checked
            ? "私有插件已保存，不会提交审核。"
            : "草稿已保存，尚未提交审核。",
          "ok"
        );
      } catch (error) {
        showNotice("editor-notice", error.message, "error");
      } finally {
        $("save-draft").disabled = false;
      }
    }

    function readManifest() {
      const endpoint = $("plugin-endpoint").value.trim();
      if (!endpoint) throw new Error("请填写数据源 URL。");
      const manifest = {
        type: $("plugin-type").value.trim(),
        name: $("plugin-name").value.trim(), author: state.user.nick,
        version: $("plugin-version").value.trim(), desc: $("plugin-desc").value.trim(),
        endpoint
      };
      if (state.editing) manifest.id = $("plugin-id").value.trim();
      optional(manifest, "icon", $("plugin-icon").value.trim());
      const seen = new Set();
      for (const row of $("custom-fields").querySelectorAll(".custom-row")) {
        const key = row.querySelector(".custom-key").value.trim();
        if (!key || known.has(key) || seen.has(key)) throw new Error("自定义字段名为空、重复或与内置字段冲突。");
        seen.add(key);
        const type = row.querySelector(".custom-type").value;
        const raw = row.querySelector(".custom-value").value;
        manifest[key] = parseCustom(raw, type, key);
      }
      return manifest;
    }

    function addCustomField(key, value) {
      const empty = $("custom-fields").querySelector(".custom-empty");
      if (empty) empty.remove();
      const row = document.createElement("div"); row.className = "custom-row";
      const keyInput = document.createElement("input");
      keyInput.className = "custom-key"; keyInput.placeholder = "字段名，例如 ua"; keyInput.value = key;
      keyInput.setAttribute("aria-label", "自定义字段名");
      const type = document.createElement("select"); type.className = "custom-type";
      type.setAttribute("aria-label", "自定义字段类型");
      [["string","文本"],["number","数字"],["boolean","布尔"],["json","JSON"]].forEach(([value,label]) => {
        const option = document.createElement("option"); option.value = value; option.textContent = label; type.append(option);
      });
      type.value = inferType(value);
      const valueInput = document.createElement("input");
      valueInput.className = "custom-value"; valueInput.setAttribute("aria-label", "自定义字段值");
      valueInput.value = type.value === "json" ? JSON.stringify(value) : String(value ?? "");
      const remove = document.createElement("button");
      remove.className = "button"; remove.type = "button"; remove.textContent = "移除";
      remove.addEventListener("click", () => { row.remove(); updateCustomEmpty(); });
      row.append(keyInput,type,valueInput,remove); $("custom-fields").append(row);
    }
    function updateCustomEmpty() {
      if ($("custom-fields").querySelector(".custom-row")) return;
      const empty = document.createElement("div");
      empty.className = "custom-empty help"; empty.textContent = "暂无自定义字段";
      $("custom-fields").append(empty);
    }
    function inferType(value) {
      if (typeof value === "string") return "string";
      if (typeof value === "number") return "number";
      if (typeof value === "boolean") return "boolean";
      return "json";
    }
    function parseCustom(raw, type, key) {
      if (type === "string") return raw;
      if (type === "number") {
        const value = Number(raw);
        if (!raw.trim() || !Number.isFinite(value)) throw new Error(key + " 不是有效数字。");
        return value;
      }
      if (type === "boolean") {
        if (raw.toLowerCase() === "true") return true;
        if (raw.toLowerCase() === "false") return false;
        throw new Error(key + " 只能是 true 或 false。");
      }
      try { return JSON.parse(raw); }
      catch { throw new Error(key + " 不是有效 JSON。"); }
    }
    function optional(target,key,value) { if (value) target[key] = value; }
    function text(value) { return typeof value === "string" ? value : ""; }
    function cell(value) {
      const td = document.createElement("td");
      if (value instanceof Node) td.append(value);
      else td.textContent = value;
      return td;
    }
    async function responseError(response) {
      const body = await response.json().catch(() => ({}));
      return new Error(body.message || "请求失败 (" + response.status + ")");
    }
    function showNotice(id,message,kind) {
      if (id === "submission-notice" || id === "push-notice") {
        if (message) showToast(message, kind);
        return;
      }
      const target = $(id);
      target.textContent = message;
      target.className = "notice" + (kind ? " " + kind : "");
    }
    let toastTimer;
    function showToast(message, kind = "ok") {
      const toast = $("toast");
      toast.textContent = message;
      toast.className = "toast visible " + kind;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.className = "toast"; }, 3200);
    }
  </script>
</body>
</html>`;

export function userSubmissionPage(mode: "login" | "register" = "login"): Response {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  return new Response(
    template
      .replaceAll("__NONCE__", nonce)
      .replaceAll("__AUTH_TITLE__", mode === "register" ? "注册账号" : "用户登录")
      .replaceAll(
        "__AUTH_SUBTITLE__",
        mode === "register" ? "验证邮箱并激活账号后即可提交插件" : "登录后管理你的插件投稿",
      )
      .replaceAll("__LOGIN_HIDDEN__", mode === "register" ? "hidden" : "")
      .replaceAll("__REGISTER_HIDDEN__", mode === "login" ? "hidden" : ""),
    {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": [
        "default-src 'none'",
        `script-src 'nonce-${nonce}'`,
        `style-src 'nonce-${nonce}'`,
        "connect-src 'self'",
        "img-src 'self' https: data:",
        "frame-src 'self' data: blob: about:",
        "child-src 'self' data: blob: about:",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join("; "),
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
    },
    },
  );
}
