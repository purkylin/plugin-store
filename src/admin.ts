const template = String.raw`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Hawk Plugin Store 管理</title>
  <style nonce="__NONCE__">
    :root {
      --bg: #07111f;
      --panel: rgba(15, 31, 51, .82);
      --panel-strong: #10233a;
      --line: rgba(164, 198, 224, .16);
      --text: #ecf7ff;
      --muted: #91a9bb;
      --accent: #55d6be;
      --accent-strong: #1eb99d;
      --blue: #6ca9ff;
      --danger: #ff7d8d;
      --shadow: 0 24px 70px rgba(0, 0, 0, .28);
    }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      background:
        radial-gradient(circle at 12% 4%, rgba(58, 134, 255, .18), transparent 34rem),
        radial-gradient(circle at 88% 12%, rgba(38, 208, 173, .13), transparent 30rem),
        var(--bg);
      font: 15px/1.55 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    button, input, textarea, select { font: inherit; }
    button { cursor: pointer; }
    .shell {
      display: grid; grid-template-columns: 236px minmax(0, 1fr); gap: 24px;
      width: min(1440px, calc(100% - 40px)); margin: 0 auto; padding: 24px 0 64px;
      align-items: start;
    }
    .sidebar {
      position: sticky; top: 24px; display: flex; flex-direction: column; min-height: calc(100vh - 48px);
      padding: 18px; border: 1px solid var(--line); border-radius: 20px;
      background: rgba(11, 27, 45, .88); box-shadow: var(--shadow); backdrop-filter: blur(18px);
    }
    .sidebar .brand { padding: 2px 4px 22px; }
    .sidebar-nav { display: grid; gap: 6px; }
    .nav-button {
      display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 12px;
      border: 0; border-radius: 11px; color: var(--muted); background: transparent; text-align: left;
    }
    .nav-button:hover { color: var(--text); background: rgba(108, 169, 255, .08); }
    .nav-button[aria-current="page"] { color: var(--text); background: rgba(108, 169, 255, .15); }
    .nav-icon { width: 20px; color: var(--blue); text-align: center; }
    .sidebar-footer { display: grid; gap: 12px; margin-top: auto; padding-top: 20px; }
    .sidebar-footer .button { width: 100%; }
    .content { min-width: 0; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin: 8px 0 24px; }
    .page-panel { display: grid; gap: 20px; }
    .brand { display: flex; align-items: center; gap: 14px; }
    .mark {
      display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px;
      color: #061b18; font-size: 22px; font-weight: 900;
      background: linear-gradient(135deg, #8af0dc, #42b8ff); box-shadow: 0 12px 36px rgba(74, 205, 188, .24);
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: clamp(22px, 3vw, 30px); letter-spacing: -.03em; }
    h2 { font-size: 17px; letter-spacing: -.01em; }
    .subtitle { color: var(--muted); font-size: 13px; margin-top: 2px; }
    .status { display: flex; align-items: center; gap: 9px; color: var(--muted); font-size: 13px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 14px var(--accent); }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; align-items: start; }
    .layout.editor-open { grid-template-columns: minmax(0, 1.1fr) minmax(390px, .9fr); }
    .card {
      border: 1px solid var(--line); border-radius: 20px; background: var(--panel);
      box-shadow: var(--shadow); backdrop-filter: blur(18px); overflow: hidden;
    }
    .review-card, .user-card, .type-card { margin: 0; }
    .type-form { display: grid; grid-template-columns: minmax(160px,.7fr) minmax(220px,1fr) auto; gap: 12px; align-items: end; }
    .type-form .field { margin: 0; }
    .type-form .actions { padding-bottom: 1px; }
    .metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 180px)); gap: 12px; padding: 20px; }
    .metric { padding: 16px; border: 1px solid var(--line); border-radius: 14px; background: rgba(2, 10, 19, .3); }
    .metric strong { display: block; font-size: 26px; line-height: 1.2; }
    .metric span { color: var(--muted); font-size: 12px; }
    .user-sections { display: grid; grid-template-columns: 1fr 1fr; }
    .user-section + .user-section { border-left: 1px solid var(--line); }
    .user-section-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 15px 20px; border-bottom: 1px solid var(--line); }
    .user-section-head h3 { font-size: 14px; }
    .user-section table { min-width: 520px; }
    .user-search { display: flex; gap: 8px; }
    .user-search input { width: min(240px, 32vw); padding: 8px 10px; }
    .card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--line); }
    .actions { display: flex; align-items: center; gap: 8px; }
    .button {
      border: 1px solid var(--line); border-radius: 11px; padding: 9px 13px;
      color: var(--text); background: rgba(255,255,255,.045); transition: .16s ease;
    }
    .button:hover { transform: translateY(-1px); border-color: rgba(108, 169, 255, .45); background: rgba(108, 169, 255, .09); }
    .button.primary { border-color: transparent; color: #06251f; font-weight: 750; background: linear-gradient(135deg, #7fe7d3, #50cbb4); }
    .button.danger { color: #ffc3cb; border-color: rgba(255, 125, 141, .3); background: rgba(255, 125, 141, .07); }
    .button:disabled { cursor: not-allowed; opacity: .45; transform: none; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 760px; }
    th, td { padding: 14px 20px; text-align: left; border-bottom: 1px solid var(--line); }
    th { color: var(--muted); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; }
    tbody tr { transition: background .15s ease; }
    tbody tr:hover { background: rgba(108, 169, 255, .055); }
    tbody tr:last-child td { border-bottom: 0; }
    .plugin-name { font-weight: 700; }
    .plugin-id { display: block; color: var(--muted); font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
    .badge { display: inline-flex; padding: 3px 8px; border-radius: 99px; margin-right: 4px; color: #bfe2ff; background: rgba(87, 157, 230, .14); font-size: 11px; }
    .empty { padding: 56px 24px; color: var(--muted); text-align: center; }
    .pager { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-top: 1px solid var(--line); color: var(--muted); font-size: 13px; }
    form { padding: 20px; }
    .field { margin-bottom: 16px; }
    label { display: block; color: #c3d6e4; font-size: 12px; font-weight: 700; margin-bottom: 7px; }
    input, textarea, select {
      width: 100%; color: var(--text); border: 1px solid var(--line); border-radius: 11px;
      outline: none; background: rgba(2, 10, 19, .5); padding: 11px 12px;
    }
    input:focus, textarea:focus, select:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(108, 169, 255, .12); }
    input:disabled { color: #8ca3b5; cursor: not-allowed; background: rgba(2, 10, 19, .8); }
    textarea { min-height: 92px; resize: vertical; }
    .json-preview {
      min-height: 390px; max-height: 620px; overflow: auto; margin: 0; padding: 16px;
      border: 1px solid var(--line); border-radius: 11px; color: #c8d8e5;
      background: rgba(2, 10, 19, .62); white-space: pre-wrap; overflow-wrap: anywhere;
      font: 12px/1.65 ui-monospace, SFMono-Regular, Menlo, monospace; tab-size: 2;
    }
    .json-key { color: #78c7ff; }
    .json-string { color: #8ce3bf; }
    .json-number { color: #f4bd76; }
    .json-boolean { color: #cf9cff; }
    .json-null { color: #91a9bb; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .editor-tabs {
      display: flex; gap: 4px; padding: 4px; margin-bottom: 18px; border: 1px solid var(--line);
      border-radius: 12px; background: rgba(2, 10, 19, .38);
    }
    .editor-tab {
      flex: 1; border: 0; border-radius: 8px; padding: 8px 10px; color: var(--muted);
      background: transparent; font-size: 13px; font-weight: 700;
    }
    .editor-tab[aria-selected="true"] { color: var(--text); background: rgba(108, 169, 255, .15); }
    .field-help { display: block; color: var(--muted); font-size: 11px; margin-top: 5px; }
    .required::after { content: " *"; color: var(--danger); }
    .input-group { display: flex; gap: 8px; align-items: center; }
    .input-group input { flex: 1; }
    .inspect-results { display: grid; gap: 10px; margin: 16px 0; padding: 14px; border: 1px solid var(--line); border-radius: 12px; background: rgba(2, 10, 19, .45); }
    .inspect-item { display: grid; grid-template-columns: 80px 1fr; gap: 10px; font-size: 13px; line-height: 1.5; }
    .inspect-label { color: var(--muted); font-weight: 500; }
    .inspect-val { color: var(--text); overflow-wrap: anywhere; }
    .inspect-desc { white-space: pre-wrap; }
    #inspect-dialog { width: min(620px, calc(100% - 32px)); }
    .section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 20px 0 10px; }
    .section-head h3 { margin: 0; font-size: 14px; }
    .section-head .button { padding: 6px 10px; font-size: 12px; }
    .custom-fields { display: grid; gap: 10px; }
    .custom-row {
      display: grid; grid-template-columns: minmax(110px, .8fr) 92px minmax(150px, 1.2fr) auto;
      gap: 8px; align-items: start;
    }
    .custom-row input, .custom-row select { padding: 9px 10px; }
    .custom-remove { padding: 9px 11px; }
    .custom-empty { padding: 14px; border: 1px dashed var(--line); border-radius: 11px; color: var(--muted); text-align: center; font-size: 12px; }
    .checks { display: flex; gap: 18px; padding: 4px 0; }
    .checks label { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 14px; font-weight: 500; }
    .checks input { width: auto; accent-color: var(--accent-strong); }
    .form-actions { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .file-label { margin: 0; font-weight: 500; }
    input[type=file] { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
    .notice { min-height: 22px; margin-top: 13px; font-size: 13px; color: var(--muted); }
    .notice.ok { color: var(--accent); }
    .notice.error { color: var(--danger); }
    .review-card > .notice, .user-card > .notice, .type-card > .notice { margin: 0; padding: 0 20px 14px; }
    dialog {
      width: min(430px, calc(100% - 32px)); color: var(--text); border: 1px solid var(--line);
      border-radius: 20px; background: #0b1b2d; box-shadow: var(--shadow); padding: 0;
    }
    dialog::backdrop { background: rgba(2, 8, 15, .76); backdrop-filter: blur(8px); }
    .dialog-body { padding: 24px; }
    .dialog-body p { color: var(--muted); margin: 8px 0 18px; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    #review-dialog { width: min(760px, calc(100% - 32px)); }
    .review-meta { color: var(--muted); font-size: 13px; margin-bottom: 12px; }
    #review-manifest { min-height: 180px; max-height: 360px; margin-bottom: 16px; }
    .dialog-toolbar { display: flex; justify-content: flex-end; margin: -4px 0 12px; }
    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; width: min(100% - 24px, 720px); padding-top: 12px; }
      .sidebar { position: static; min-height: 0; padding: 12px; }
      .sidebar .brand { padding: 0 2px 12px; }
      .sidebar-nav { display: flex; overflow-x: auto; }
      .nav-button { flex: 0 0 auto; width: auto; }
      .sidebar-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; }
      .sidebar-footer .button { width: auto; }
      .layout.editor-open { grid-template-columns: 1fr; }
      header { align-items: flex-start; }
      .status { padding-top: 8px; }
      .user-sections { grid-template-columns: 1fr; }
      .user-section + .user-section { border-left: 0; border-top: 1px solid var(--line); }
      .type-form { grid-template-columns: 1fr 1fr; }
      .type-form .actions { grid-column: 1 / -1; }
    }
    @media (max-width: 520px) {
      .metrics { grid-template-columns: 1fr; }
      .row { grid-template-columns: 1fr; gap: 0; }
      .custom-row { grid-template-columns: 1fr 90px auto; }
      .custom-row .custom-value { grid-column: 1 / -1; grid-row: 2; }
      .card-head { align-items: flex-start; }
      .actions { flex-wrap: wrap; justify-content: flex-end; }
      .form-actions { align-items: stretch; flex-direction: column; }
      .form-actions .button, .file-label { width: 100%; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar" id="admin-sidebar">
      <div class="brand">
        <div class="mark">H</div>
        <div><h2>Plugin Store</h2><p class="subtitle">管理后台</p></div>
      </div>
      <nav class="sidebar-nav" aria-label="后台导航">
        <button class="nav-button" type="button" data-panel="reviews" aria-current="page"><span class="nav-icon">◎</span>待审核</button>
        <button class="nav-button" type="button" data-panel="plugins"><span class="nav-icon">◇</span>已上架插件</button>
        <button class="nav-button" type="button" data-panel="users"><span class="nav-icon">♙</span>用户与白名单</button>
        <button class="nav-button" type="button" data-panel="settings"><span class="nav-icon">⚙</span>系统设置</button>
      </nav>
      <div class="sidebar-footer">
        <div class="status"><span class="dot"></span><span id="connection">等待验证</span></div>
        <button class="button" id="reauth" type="button">更换管理员 Token</button>
      </div>
    </aside>
    <div class="content">
    <header>
      <div><h1 id="page-title">待审核投稿</h1><p class="subtitle" id="page-subtitle">查看投稿内容并决定是否发布</p></div>
      <button class="button" id="refresh" type="button">刷新数据</button>
    </header>

    <section class="card type-card" data-page="settings" aria-labelledby="types-title" hidden>
      <div class="card-head">
        <div><h2 id="types-title">插件类型</h2><p class="subtitle">配置作者创建插件时可选择的名称和 value</p></div>
      </div>
      <form class="type-form" id="plugin-type-form">
        <div class="field"><label class="required" for="type-value">Value</label><input id="type-value" maxlength="40" pattern="[a-z][a-z0-9._-]{0,39}" placeholder="例如 hot" required></div>
        <div class="field"><label class="required" for="type-name">显示名称</label><input id="type-name" maxlength="60" placeholder="例如 热榜" required></div>
        <div class="actions"><button class="button" id="cancel-type-edit" type="button" hidden>取消</button><button class="button primary" id="save-plugin-type" type="submit">新增类型</button></div>
      </form>
      <div class="table-wrap">
        <table>
          <thead><tr><th>显示名称</th><th>Value</th><th></th></tr></thead>
          <tbody id="plugin-type-rows"></tbody>
        </table>
        <div class="empty" id="plugin-types-empty" hidden>尚未配置插件类型。</div>
      </div>
      <p class="notice" id="plugin-type-notice" role="status"></p>
    </section>

    <section class="card user-card" data-page="users" aria-labelledby="users-title" hidden>
      <div class="card-head">
        <div><h2 id="users-title">用户统计</h2><p class="subtitle">注册用户、插件贡献排行与免审白名单</p></div>
      </div>
      <div class="metrics">
        <div class="metric"><strong id="total-users">—</strong><span>注册用户</span></div>
        <div class="metric"><strong id="whitelisted-users">—</strong><span>白名单用户</span></div>
        <div class="metric"><strong id="private-plugins">—</strong><span>私有插件</span></div>
      </div>
      <div class="user-sections">
        <section class="user-section">
          <div class="user-section-head"><h3>贡献用户 Top 5</h3><span class="subtitle">按审核通过的插件数</span></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>用户</th><th>贡献插件</th><th>白名单</th></tr></thead>
              <tbody id="contributor-rows"></tbody>
            </table>
            <div class="empty" id="contributors-empty" hidden>还没有用户贡献插件。</div>
          </div>
        </section>
        <section class="user-section">
          <div class="user-section-head">
            <h3>白名单管理</h3>
            <div class="user-search">
              <input id="user-search" placeholder="搜索 Email 或昵称">
              <button class="button" id="search-users" type="button">搜索</button>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>用户</th><th>贡献插件</th><th></th></tr></thead>
              <tbody id="user-rows"></tbody>
            </table>
            <div class="empty" id="users-empty" hidden>没有匹配的用户。</div>
          </div>
          <div class="pager">
            <button class="button" id="users-previous" type="button" disabled>上一页</button>
            <span id="users-page-label">第 1 页</span>
            <button class="button" id="users-next" type="button" disabled>下一页</button>
          </div>
        </section>
      </div>
      <p class="notice" id="user-notice" role="status"></p>
    </section>

    <section class="card review-card" data-page="reviews" aria-labelledby="reviews-title">
      <div class="card-head">
        <div><h2 id="reviews-title">待审核投稿</h2><p class="subtitle" id="review-summary">验证后载入</p></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>插件</th><th>投稿用户</th><th>版本</th><th>提交时间</th><th></th></tr></thead>
          <tbody id="review-rows"></tbody>
        </table>
        <div class="empty" id="review-empty" hidden>当前没有等待审核的投稿。</div>
      </div>
      <p class="notice" id="review-notice" role="status"></p>
    </section>

    <main class="layout" id="workspace" data-page="plugins" hidden>
      <section class="card" aria-labelledby="plugins-title">
        <div class="card-head">
          <div><h2 id="plugins-title">已上架插件</h2><p class="subtitle" id="result-summary">—</p></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>插件</th><th>作者</th><th>版本</th><th>平台</th><th>安装数</th><th></th></tr></thead>
            <tbody id="plugin-rows"></tbody>
          </table>
          <div class="empty" id="empty" hidden>还没有审核通过的插件。</div>
        </div>
        <div class="pager">
          <button class="button" id="previous" type="button" disabled>上一页</button>
          <span id="page-label">第 1 页</span>
          <button class="button" id="next" type="button" disabled>下一页</button>
        </div>
      </section>

      <section class="card" id="editor-card" aria-labelledby="editor-title" hidden>
        <div class="card-head">
          <div><h2 id="editor-title">发布插件</h2><p class="subtitle">填写 Hawk manifest，服务端会自动计算校验值</p></div>
          <button class="button" id="close-editor" type="button">关闭</button>
        </div>
        <form id="publish-form">
          <div class="editor-tabs" role="tablist" aria-label="编辑模式">
            <button class="editor-tab" id="form-mode" type="button" role="tab" aria-selected="true" aria-controls="form-editor">表单编辑</button>
            <button class="editor-tab" id="json-mode" type="button" role="tab" aria-selected="false" aria-controls="json-editor">高级 JSON</button>
          </div>
          <div id="form-editor" role="tabpanel" aria-labelledby="form-mode">
            <div class="row">
              <div class="field"><label class="required" for="plugin-id">插件 ID</label><input id="plugin-id" placeholder="例如 com.example.hot" autocomplete="off"></div>
              <div class="field"><label class="required" for="plugin-type">插件类型</label><input id="plugin-type" placeholder="例如 hot" autocomplete="off"></div>
            </div>
            <div class="row">
              <div class="field"><label class="required" for="plugin-name">名称</label><input id="plugin-name" autocomplete="off"></div>
              <div class="field"><label class="required" for="plugin-author">作者</label><input id="plugin-author" autocomplete="off"></div>
            </div>
            <div class="field"><label class="required" for="plugin-version">版本</label><input id="plugin-version" placeholder="例如 1.0.0" inputmode="decimal" autocomplete="off"><span class="field-help" id="version-help">新插件可从 1.0.0 开始。</span></div>
            <div class="field"><label for="plugin-icon">图标 URL</label><input id="plugin-icon" type="url" placeholder="https://…" autocomplete="off"></div>
            <div class="field">
              <label class="required" for="plugin-endpoint">数据源 URL</label>
              <div class="input-group">
                <input id="plugin-endpoint" type="url" placeholder="配置地址" autocomplete="off" required>
                <button class="button" id="inspect-endpoint" type="button" hidden>检查</button>
              </div>
            </div>
            <div class="field"><label class="required" for="plugin-desc">描述</label><textarea id="plugin-desc"></textarea></div>
            <span class="field-help">更新时间将在发布时由服务端自动生成。</span>
            <div class="section-head">
              <div><h3>自定义字段</h3><span class="field-help">例如 ua、headers 或插件专用配置。</span></div>
              <button class="button" id="add-custom-field" type="button">添加字段</button>
            </div>
            <div class="custom-fields" id="custom-fields"></div>
          </div>
          <div id="json-editor" role="tabpanel" aria-labelledby="json-mode" hidden>
            <div class="field">
              <label>Manifest JSON 预览</label>
              <pre class="json-preview" id="manifest-preview" aria-label="Manifest JSON 只读预览"></pre>
              <span class="field-help">只读预览会由表单实时生成，发布时服务端会覆盖 update_time。</span>
            </div>
          </div>
          <div class="field">
            <label>支持平台</label>
            <div class="checks">
              <label><input id="platform-ios" type="checkbox" checked> iOS</label>
              <label><input id="platform-tvos" type="checkbox" checked> tvOS</label>
            </div>
          </div>
          <div class="row">
            <div class="field"><label for="minimum-ios">最低 iOS App 版本</label><input id="minimum-ios" placeholder="例如 1.4.0"></div>
            <div class="field"><label for="minimum-tvos">最低 tvOS App 版本</label><input id="minimum-tvos" placeholder="例如 1.4.0"></div>
          </div>
          <div class="form-actions">
            <label class="button file-label" for="manifest-file">导入 JSON 文件</label>
            <input id="manifest-file" type="file" accept="application/json,.json">
            <button class="button primary" id="publish" type="submit">发布插件</button>
          </div>
          <p class="notice" id="notice" role="status"></p>
        </form>
      </section>
    </main>
    </div>
  </div>

  <dialog id="login-dialog">
    <form class="dialog-body" id="login-form" method="dialog">
      <h2>管理验证</h2>
      <p>请输入 Worker 中配置的 ADMIN_TOKEN。若要轮换密钥，请先在部署平台更新，再回到这里输入新 Token。</p>
      <label for="admin-token">Admin Token</label>
      <input id="admin-token" type="password" autocomplete="current-password" required>
      <p class="notice error" id="login-error" role="alert"></p>
      <div class="dialog-actions"><button class="button primary" type="submit">进入管理后台</button></div>
    </form>
  </dialog>

  <dialog id="delete-dialog">
    <div class="dialog-body">
      <h2>下架插件</h2>
      <p>下架 <strong id="delete-plugin-name"></strong> 后将从插件市场隐藏，但插件、版本和审核历史都会保留。</p>
      <div class="field">
        <label for="unpublish-reason">下架原因</label>
        <textarea id="unpublish-reason" maxlength="500" placeholder="请说明需要修改的内容"></textarea>
      </div>
      <p class="notice error" id="delete-error" role="alert"></p>
      <div class="dialog-actions">
        <button class="button" id="cancel-delete" type="button">取消</button>
        <button class="button danger" id="confirm-delete" type="button">确认下架</button>
      </div>
    </div>
  </dialog>

  <dialog id="review-dialog">
    <div class="dialog-body">
      <h2 id="review-dialog-title">审核投稿</h2>
      <p id="review-dialog-message"></p>
      <div class="review-meta" id="review-meta"></div>
      <pre class="json-preview" id="review-manifest" aria-label="投稿 Manifest"></pre>
      <div class="dialog-toolbar"><button class="button" id="review-copy" type="button">复制配置</button></div>
      <div class="field" id="rejection-field" hidden>
        <label for="rejection-reason">拒绝原因</label>
        <textarea id="rejection-reason" maxlength="500" placeholder="请说明需要修改的内容"></textarea>
      </div>
      <p class="notice error" id="review-dialog-error" role="alert"></p>
      <div class="dialog-actions">
        <button class="button" id="cancel-review" type="button">取消</button>
        <button class="button primary" id="confirm-review" type="button">确认</button>
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

  <script nonce="__NONCE__">
    const state = {
      token: "", cursor: null, nextCursor: null, history: [], page: 1, items: [],
      editorMode: "form", editorManifest: {}, editingID: null, originalVersion: null,
      pendingDelete: null, reviews: [], pendingReview: null, reviewAction: null,
      users: [], contributors: [], pluginTypes: [], editingType: null,
      usersPage: 1, usersTotalPages: 1, activePanel: "reviews"
    };
    const $ = (id) => document.getElementById(id);
    const knownFields = new Set([
      "id", "type", "icon", "name", "author", "version",
      "update_time", "desc", "endpoint"
    ]);
    const template = {
      id: "example.plugin", type: "", icon: "",
      name: "Example Plugin", author: "Author", version: "1.0.0",
      desc: "Plugin description", endpoint: ""
    };

    $("login-dialog").showModal();
    $("login-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const nextToken = $("admin-token").value.trim();
      if (!nextToken) return;
      const previousToken = state.token;
      state.token = nextToken;
      const ok = await loadPlugins(true);
      if (ok) {
        $("login-dialog").close();
      } else {
        state.token = previousToken;
        if (previousToken) $("connection").textContent = "已连接";
      }
    });
    $("reauth").addEventListener("click", () => {
      $("admin-token").value = "";
      $("login-error").textContent = "";
      $("login-dialog").showModal();
    });
    $("refresh").addEventListener("click", () => loadPlugins());
    document.querySelectorAll(".nav-button").forEach((button) => {
      button.addEventListener("click", () => switchPanel(button.dataset.panel));
    });
    $("plugin-type-form").addEventListener("submit", savePluginType);
    $("cancel-type-edit").addEventListener("click", resetPluginTypeForm);
    $("search-users").addEventListener("click", searchUsers);
    $("users-previous").addEventListener("click", () => {
      state.usersPage = Math.max(1, state.usersPage - 1);
      loadUsers();
    });
    $("users-next").addEventListener("click", () => {
      state.usersPage = Math.min(state.usersTotalPages, state.usersPage + 1);
      loadUsers();
    });
    $("user-search").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchUsers();
      }
    });
    $("close-editor").addEventListener("click", closeEditor);
    $("form-mode").addEventListener("click", () => setEditorMode("form"));
    $("json-mode").addEventListener("click", () => setEditorMode("json"));
    $("add-custom-field").addEventListener("click", () => appendCustomField("", ""));
    $("plugin-type").addEventListener("input", updateInspectButtonVisibility);
    $("plugin-type").addEventListener("change", updateInspectButtonVisibility);
    $("inspect-endpoint").addEventListener("click", inspectEndpoint);
    $("inspect-cancel").addEventListener("click", () => {
      if ($("inspect-dialog").open) $("inspect-dialog").close();
    });
    $("inspect-fill").addEventListener("click", fillFromInspection);
    $("cancel-delete").addEventListener("click", () => {
      state.pendingDelete = null;
      $("delete-dialog").close();
    });
    $("confirm-delete").addEventListener("click", confirmDelete);
    $("cancel-review").addEventListener("click", () => {
      state.pendingReview = null; state.reviewAction = null;
      $("review-dialog").close();
    });
    $("confirm-review").addEventListener("click", confirmReview);
    $("review-copy").addEventListener("click", copyReviewManifest);
    $("previous").addEventListener("click", () => {
      state.cursor = state.history.pop() ?? null;
      state.page = Math.max(1, state.page - 1);
      loadPlugins();
    });
    $("next").addEventListener("click", () => {
      state.history.push(state.cursor);
      state.cursor = state.nextCursor;
      state.page += 1;
      loadPlugins();
    });
    $("manifest-file").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        const imported = parsed.manifest ?? parsed;
        if (!imported || typeof imported !== "object" || Array.isArray(imported)) {
          throw new Error("Manifest 必须是 JSON 对象。");
        }
        if (state.editingID) {
          imported.id = state.editorManifest.id;
          imported.type = state.editorManifest.type;
          imported.author = state.editorManifest.author;
        }
        populateEditor(imported);
        if (parsed.platforms) setPlatforms(parsed.platforms);
        $("minimum-ios").value = parsed.minimum_ios_version ?? "";
        $("minimum-tvos").value = parsed.minimum_tvos_version ?? "";
        applyFieldLocks(true);
        showNotice("文件已载入，请确认后发布。", "ok");
      } catch {
        showNotice("JSON 文件格式不正确。", "error");
      }
    });
    $("publish-form").addEventListener("submit", publishPlugin);

    const panelCopy = {
      reviews: ["待审核投稿", "查看投稿内容并决定是否发布"],
      plugins: ["已上架插件", "查看市场内容、安装数据及下架插件"],
      users: ["用户与白名单", "查看贡献情况并管理免审用户"],
      settings: ["系统设置", "维护低频变动的插件类型配置"]
    };

    function switchPanel(panel) {
      if (!panelCopy[panel]) return;
      state.activePanel = panel;
      document.querySelectorAll("[data-page]").forEach((section) => {
        section.hidden = section.dataset.page !== panel;
      });
      document.querySelectorAll(".nav-button").forEach((button) => {
        if (button.dataset.panel === panel) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      });
      $("page-title").textContent = panelCopy[panel][0];
      $("page-subtitle").textContent = panelCopy[panel][1];
    }

    async function loadPlugins(isLogin = false) {
      setBusy(true);
      try {
        const url = new URL("/api/v1/admin/plugins", location.origin);
        url.searchParams.set("limit", "20");
        if (state.cursor) url.searchParams.set("cursor", state.cursor);
        const response = await api(url);
        if (!response.ok) throw await responseError(response);
        const page = await response.json();
        state.items = page.items;
        state.nextCursor = page.next_cursor;
        renderRows();
        await Promise.all([loadReviews(), loadUsers(), loadPluginTypes()]);
        $("connection").textContent = "已连接";
        $("login-error").textContent = "";
        return true;
      } catch (error) {
        $("connection").textContent = "验证失败";
        if (isLogin) $("login-error").textContent = error.message;
        else showNotice(error.message, "error");
        return false;
      } finally {
        setBusy(false);
      }
    }

    async function loadPluginTypes() {
      const response = await api("/api/v1/admin/plugin-types");
      if (!response.ok) throw await responseError(response);
      state.pluginTypes = (await response.json()).items;
      const tbody = $("plugin-type-rows");
      tbody.replaceChildren();
      $("plugin-types-empty").hidden = state.pluginTypes.length !== 0;
      for (const type of state.pluginTypes) {
        const row = document.createElement("tr");
        row.append(cell(type.name));
        const value = document.createElement("code");
        value.textContent = type.value;
        row.append(cell(value));
        const actions = document.createElement("td");
        actions.className = "actions";
        const edit = document.createElement("button");
        edit.className = "button"; edit.type = "button"; edit.textContent = "编辑";
        edit.addEventListener("click", () => editPluginType(type));
        const remove = document.createElement("button");
        remove.className = "button danger"; remove.type = "button"; remove.textContent = "删除";
        remove.addEventListener("click", () => removePluginType(type, remove));
        actions.append(edit, remove);
        row.append(actions);
        tbody.append(row);
      }
    }

    function editPluginType(type) {
      state.editingType = type.value;
      $("type-value").value = type.value;
      $("type-value").disabled = true;
      $("type-name").value = type.name;
      $("save-plugin-type").textContent = "保存名称";
      $("cancel-type-edit").hidden = false;
      $("type-name").focus();
    }

    function resetPluginTypeForm() {
      state.editingType = null;
      $("plugin-type-form").reset();
      $("type-value").disabled = false;
      $("save-plugin-type").textContent = "新增类型";
      $("cancel-type-edit").hidden = true;
    }

    async function savePluginType(event) {
      event.preventDefault();
      const button = $("save-plugin-type");
      button.disabled = true;
      $("plugin-type-notice").textContent = "";
      try {
        const response = await api("/api/v1/admin/plugin-types", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            value: state.editingType || $("type-value").value.trim(),
            name: $("type-name").value.trim()
          })
        });
        if (!response.ok) throw await responseError(response);
        const saved = await response.json();
        resetPluginTypeForm();
        await loadPluginTypes();
        $("plugin-type-notice").textContent = saved.name + "（" + saved.value + "）已保存。";
        $("plugin-type-notice").className = "notice ok";
      } catch (error) {
        $("plugin-type-notice").textContent = error.message;
        $("plugin-type-notice").className = "notice error";
      } finally {
        button.disabled = false;
      }
    }

    async function removePluginType(type, button) {
      if (!confirm("删除插件类型 " + type.name + "（" + type.value + "）？")) return;
      button.disabled = true;
      try {
        const response = await api(
          "/api/v1/admin/plugin-types/" + encodeURIComponent(type.value),
          { method: "DELETE" }
        );
        if (!response.ok) throw await responseError(response);
        if (state.editingType === type.value) resetPluginTypeForm();
        await loadPluginTypes();
        $("plugin-type-notice").textContent = "插件类型已删除。";
        $("plugin-type-notice").className = "notice ok";
      } catch (error) {
        $("plugin-type-notice").textContent = error.message;
        $("plugin-type-notice").className = "notice error";
        button.disabled = false;
      }
    }

    function renderRows() {
      const tbody = $("plugin-rows");
      tbody.replaceChildren();
      $("empty").hidden = state.items.length !== 0;
      for (const item of state.items) {
        const row = document.createElement("tr");
        row.append(cell(pluginIdentity(item)));
        row.append(cell(item.author));
        row.append(cell(item.latest_version));
        const platforms = document.createElement("td");
        item.platforms.forEach((platform) => {
          const badge = document.createElement("span");
          badge.className = "badge"; badge.textContent = platform; platforms.append(badge);
        });
        row.append(platforms);
        row.append(cell(new Intl.NumberFormat().format(item.install_count)));
        const action = document.createElement("td");
        const actionWrap = document.createElement("div");
        actionWrap.className = "actions";
        const view = document.createElement("button");
        view.className = "button"; view.type = "button"; view.textContent = "查看";
        view.addEventListener("click", () => viewPublishedPlugin(item));
        const remove = document.createElement("button");
        remove.className = "button danger"; remove.type = "button"; remove.textContent = "下架";
        remove.addEventListener("click", () => requestDelete(item));
        actionWrap.append(view, remove);
        action.append(actionWrap);
        row.append(action); tbody.append(row);
      }
      $("result-summary").textContent = "本页 " + state.items.length + " 个插件";
      $("page-label").textContent = "第 " + state.page + " 页";
      $("previous").disabled = state.history.length === 0;
      $("next").disabled = !state.nextCursor;
    }

    async function loadUsers() {
      const url = new URL("/api/v1/admin/users", location.origin);
      const search = $("user-search").value.trim();
      if (search) url.searchParams.set("q", search);
      url.searchParams.set("page", String(state.usersPage));
      url.searchParams.set("page_size", "20");
      const [statsResponse, usersResponse] = await Promise.all([
        api("/api/v1/admin/users/stats"),
        api(url)
      ]);
      if (!statsResponse.ok) throw await responseError(statsResponse);
      if (!usersResponse.ok) throw await responseError(usersResponse);
      const stats = await statsResponse.json();
      const usersPage = await usersResponse.json();
      state.contributors = stats.top_contributors;
      state.users = usersPage.items;
      state.usersPage = usersPage.page;
      state.usersTotalPages = usersPage.total_pages;
      $("total-users").textContent = new Intl.NumberFormat().format(stats.total_users);
      $("whitelisted-users").textContent =
        new Intl.NumberFormat().format(stats.whitelisted_users);
      $("private-plugins").textContent =
        new Intl.NumberFormat().format(stats.private_plugins ?? 0);
      renderUsers("contributor-rows", state.contributors, false);
      renderUsers("user-rows", state.users, true);
      $("contributors-empty").hidden = state.contributors.length !== 0;
      $("users-empty").hidden = state.users.length !== 0;
      $("users-page-label").textContent = "第 " + state.usersPage + " / "
        + state.usersTotalPages + " 页 · 共 " + usersPage.total + " 位用户";
      $("users-previous").disabled = state.usersPage <= 1;
      $("users-next").disabled = state.usersPage >= state.usersTotalPages;
    }

    async function searchUsers() {
      try {
        state.usersPage = 1;
        await loadUsers();
        $("user-notice").textContent = "";
      } catch (error) {
        $("user-notice").textContent = error.message;
        $("user-notice").className = "notice error";
      }
    }

    function renderUsers(targetID, users, actions) {
      const tbody = $(targetID);
      tbody.replaceChildren();
      for (const user of users) {
        const row = document.createElement("tr");
        row.append(cell(userIdentity(user)));
        row.append(cell(new Intl.NumberFormat().format(user.contribution_count)));
        if (actions) {
          const action = document.createElement("td");
          const button = document.createElement("button");
          button.className = user.whitelisted ? "button danger" : "button";
          button.type = "button";
          button.textContent = user.whitelisted ? "移出白名单" : "加入白名单";
          button.addEventListener("click", () => toggleWhitelist(user, button));
          action.append(button);
          row.append(action);
        } else {
          const status = document.createElement("span");
          status.className = "badge";
          status.textContent = user.whitelisted ? "是" : "否";
          row.append(cell(status));
        }
        tbody.append(row);
      }
    }

    function userIdentity(user) {
      const wrap = document.createElement("div");
      const nick = document.createElement("span");
      nick.className = "plugin-name";
      nick.textContent = user.nick;
      const email = document.createElement("span");
      email.className = "plugin-id";
      email.textContent = user.email;
      wrap.append(nick, email);
      return wrap;
    }

    async function toggleWhitelist(user, button) {
      const enabled = !user.whitelisted;
      if (!confirm(
        enabled
          ? "将 " + user.nick + " 加入白名单？其投稿将无需审核直接上架。"
          : "将 " + user.nick + " 移出白名单？之后的投稿将恢复人工审核。"
      )) return;
      button.disabled = true;
      $("user-notice").textContent = "";
      try {
        const response = await api(
          "/api/v1/admin/users/" + encodeURIComponent(user.id) + "/whitelist",
          {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ enabled })
          }
        );
        if (!response.ok) throw await responseError(response);
        $("user-notice").textContent = enabled
          ? user.nick + " 已加入白名单。"
          : user.nick + " 已移出白名单。";
        $("user-notice").className = "notice ok";
        await loadUsers();
      } catch (error) {
        $("user-notice").textContent = error.message;
        $("user-notice").className = "notice error";
        button.disabled = false;
      }
    }

    async function loadReviews() {
      const response = await api("/api/v1/admin/reviews?limit=100");
      if (!response.ok) throw await responseError(response);
      state.reviews = (await response.json()).items;
      const tbody = $("review-rows");
      tbody.replaceChildren();
      $("review-empty").hidden = state.reviews.length !== 0;
      $("review-summary").textContent = state.reviews.length + " 个投稿等待处理";
      for (const item of state.reviews) {
        const row = document.createElement("tr");
        row.append(cell(pluginIdentity({
          name: item.manifest.name,
          id: item.plugin_id
        })));
        row.append(cell(item.user.nick + " / " + item.user.email));
        row.append(cell(item.version));
        row.append(cell(new Date(item.submitted_at).toLocaleString()));
        const action = document.createElement("td");
        const wrap = document.createElement("div");
        wrap.className = "actions";
        const detail = document.createElement("button");
        detail.className = "button"; detail.type = "button"; detail.textContent = "查看内容";
        detail.addEventListener("click", () => openReviewDialog(item, "view"));
        const accept = document.createElement("button");
        accept.className = "button primary"; accept.type = "button"; accept.textContent = "接受";
        accept.addEventListener("click", () => acceptReview(item));
        const reject = document.createElement("button");
        reject.className = "button danger"; reject.type = "button"; reject.textContent = "拒绝";
        reject.addEventListener("click", () => rejectReview(item));
        wrap.append(detail, accept, reject); action.append(wrap); row.append(action); tbody.append(row);
      }
    }

    function acceptReview(item) {
      openReviewDialog(item, "accept");
    }

    function rejectReview(item) {
      openReviewDialog(item, "reject");
    }

    function openReviewDialog(item, action) {
      state.pendingReview = item;
      state.reviewAction = action;
      const accepting = action === "accept";
      const viewing = action === "view";
      $("review-dialog-title").textContent = viewing
        ? "投稿内容"
        : accepting ? "接受投稿" : "拒绝投稿";
      $("review-dialog-message").textContent = viewing
        ? item.manifest.name + " · " + item.plugin_id
        : accepting
          ? "确认发布 " + item.plugin_id + " " + item.version + " 到插件市场？"
          : "拒绝 " + item.plugin_id + " " + item.version + "，并将原因反馈给投稿用户。";
      $("review-meta").textContent =
        "作者：" + item.user.nick
        + "　平台：" + item.platforms.join(", ")
        + "　最低 iOS：" + (item.minimum_ios_version || "不限")
        + "　最低 tvOS：" + (item.minimum_tvos_version || "不限");
      $("review-manifest").innerHTML = highlightJSON(JSON.stringify(item.manifest, null, 2));
      $("review-copy").textContent = "复制配置";
      $("rejection-field").hidden = action !== "reject";
      $("rejection-reason").value = "";
      $("review-dialog-error").textContent = "";
      $("confirm-review").hidden = viewing;
      $("confirm-review").textContent = accepting ? "接受并发布" : "确认拒绝";
      $("confirm-review").className = accepting ? "button primary" : "button danger";
      $("review-dialog").showModal();
      if (action === "reject") $("rejection-reason").focus();
    }

    async function confirmReview() {
      const item = state.pendingReview;
      const action = state.reviewAction;
      if (!item || (action !== "accept" && action !== "reject")) return;
      const reason = $("rejection-reason").value.trim();
      if (action === "reject" && reason.length < 2) {
        $("review-dialog-error").textContent = "拒绝原因至少需要 2 个字符。";
        return;
      }
      $("confirm-review").disabled = true;
      $("review-dialog-error").textContent = "";
      try {
        const response = await api(
          "/api/v1/admin/reviews/" + encodeURIComponent(item.id) + "/" + action,
          action === "accept"
            ? { method: "POST" }
            : {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ reason })
              }
        );
        if (!response.ok) throw await responseError(response);
        $("review-dialog").close();
        state.pendingReview = null; state.reviewAction = null;
        if (action === "accept") {
          showReviewNotice("已接受并发布 " + item.plugin_id + " " + item.version + "。", "ok");
          state.cursor = null; state.history = []; state.page = 1;
          await loadPlugins();
        } else {
          showReviewNotice("已拒绝 " + item.plugin_id + "。", "ok");
          await loadReviews();
        }
      } catch (error) {
        $("review-dialog-error").textContent = error.message;
      } finally {
        $("confirm-review").disabled = false;
      }
    }

    function pluginIdentity(item) {
      const wrap = document.createElement("div");
      const name = document.createElement("span");
      name.className = "plugin-name"; name.textContent = item.name;
      const id = document.createElement("span");
      id.className = "plugin-id"; id.textContent = item.id;
      wrap.append(name, id); return wrap;
    }

    function viewPublishedPlugin(item) {
      state.pendingReview = null;
      state.reviewAction = "view";
      $("review-dialog-title").textContent = "查看插件";
      $("review-dialog-message").textContent = item.name + " · " + item.id;
      $("review-meta").textContent =
        "作者：" + item.author
        + "　平台：" + item.platforms.join(", ")
        + "　最低 iOS：" + (item.minimum_ios_version || "不限")
        + "　最低 tvOS：" + (item.minimum_tvos_version || "不限");
      $("review-manifest").innerHTML = highlightJSON(JSON.stringify(item.manifest, null, 2));
      $("review-copy").textContent = "复制配置";
      $("rejection-field").hidden = true;
      $("review-dialog-error").textContent = "";
      $("confirm-review").hidden = true;
      $("review-dialog").showModal();
    }

    async function copyReviewManifest() {
      try {
        await navigator.clipboard.writeText($("review-manifest").textContent);
        $("review-copy").textContent = "已复制";
        $("review-dialog-error").textContent = "";
      } catch {
        $("review-dialog-error").textContent = "复制失败，请手动选择上方 JSON。";
      }
    }

    function cell(content) {
      const element = document.createElement("td");
      if (content instanceof Node) element.append(content);
      else element.textContent = content;
      return element;
    }

    function editPlugin(item) {
      state.editingID = item.id;
      state.originalVersion = item.latest_version;
      populateEditor(item.manifest);
      setPlatforms(item.platforms);
      $("minimum-ios").value = item.minimum_ios_version ?? "";
      $("minimum-tvos").value = item.minimum_tvos_version ?? "";
      $("editor-title").textContent = "更新 " + item.name;
      $("version-help").textContent = "当前版本 " + item.latest_version + "，新版本必须更高。";
      openEditor();
      showNotice("已载入 " + item.id + "。ID、类型和作者不可修改。", "ok");
      $("plugin-name").focus();
    }

    async function publishPlugin(event) {
      event.preventDefault();
      showNotice("", "");
      let manifest;
      try {
        manifest = state.editorMode === "json" ? state.editorManifest : readFormManifest();
      } catch (error) {
        return showNotice(error.message, "error");
      }
      const missingField = validateManifestForm(manifest);
      if (missingField) {
        if (state.editorMode === "json") setEditorMode("form");
        $(missingField.id).focus();
        return showNotice(missingField.message, "error");
      }
      if (
        state.originalVersion
        && compareVersionStrings(manifest.version, state.originalVersion) <= 0
      ) {
        if (state.editorMode === "json") setEditorMode("form");
        $("plugin-version").focus();
        return showNotice(
          "版本必须高于当前版本 " + state.originalVersion + "。",
          "error"
        );
      }
      const platforms = [
        ...($("platform-ios").checked ? ["ios"] : []),
        ...($("platform-tvos").checked ? ["tvos"] : [])
      ];
      if (!platforms.length) return showNotice("至少选择一个支持平台。", "error");
      const body = {
        manifest, platforms,
        minimum_ios_version: $("minimum-ios").value.trim() || null,
        minimum_tvos_version: $("minimum-tvos").value.trim() || null
      };
      $("publish").disabled = true;
      try {
        const response = await api("/api/v1/admin/plugins/" + encodeURIComponent(manifest.id), {
          method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
        });
        if (!response.ok) throw await responseError(response);
        const result = await response.json();
        state.editingID = result.id;
        state.originalVersion = result.version;
        $("editor-title").textContent = "更新 " + manifest.name;
        $("version-help").textContent = "当前版本 " + result.version + "，新版本必须更高。";
        applyFieldLocks(state.editorMode === "form");
        showNotice("发布成功：" + result.id + " " + result.version, "ok");
        state.cursor = null; state.history = []; state.page = 1;
        await loadPlugins();
      } catch (error) {
        showNotice(error.message, "error");
      } finally {
        $("publish").disabled = false;
      }
    }

    function api(input, init = {}) {
      const headers = new Headers(init.headers);
      headers.set("authorization", "Bearer " + state.token);
      return fetch(input, { ...init, headers });
    }
    async function responseError(response) {
      const body = await response.json().catch(() => ({}));
      return new Error(body.message || "请求失败 (" + response.status + ")");
    }
    function setPlatforms(platforms) {
      $("platform-ios").checked = platforms.includes("ios");
      $("platform-tvos").checked = platforms.includes("tvos");
    }
    function resetEditor() {
      state.editingID = null;
      state.originalVersion = null;
      const defaultType = state.pluginTypes[0]?.value || "";
      populateEditor({ ...template, type: defaultType });
      setPlatforms(["ios", "tvos"]);
      $("minimum-ios").value = ""; $("minimum-tvos").value = "";
      $("editor-title").textContent = "新建插件";
      $("version-help").textContent = "新插件可从 1.0.0 开始。";
      openEditor();
      showNotice("", "");
      $("plugin-id").focus();
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
        showNotice("请先输入数据源 URL 后再进行检查。", "error");
        $("plugin-endpoint").focus();
        return;
      }
      const btn = $("inspect-endpoint");
      btn.disabled = true;
      btn.textContent = "检查中…";
      showNotice("", "");
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
        showNotice("检查失败：" + (error && error.message ? error.message : String(error)), "error");
        $("notice").scrollIntoView({ behavior: "smooth", block: "nearest" });
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
        if (currentInspectData.author) {
          $("plugin-author").value = currentInspectData.author;
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
        showNotice("已将脚本信息填充至表单。", "ok");
        if (state.editorMode === "json") {
          renderJSONPreview(readFormManifest());
        }
      }
      if ($("inspect-dialog").open) $("inspect-dialog").close();
    }

    function populateEditor(manifest) {
      if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
        throw new Error("Manifest 必须是 JSON 对象。");
      }
      state.editorManifest = { ...manifest };
      $("plugin-id").value = stringValue(manifest.id);
      $("plugin-type").value = stringValue(manifest.type);
      $("plugin-name").value = stringValue(manifest.name);
      $("plugin-author").value = stringValue(manifest.author);
      $("plugin-version").value = stringValue(manifest.version);
      $("plugin-icon").value = stringValue(manifest.icon);
      $("plugin-endpoint").value = stringValue(manifest.endpoint);
      $("plugin-desc").value = stringValue(manifest.desc);
      renderCustomFields(manifest);
      renderJSONPreview({ ...manifest, update_time: new Date().toISOString() });
      updateInspectButtonVisibility();
    }
    function readFormManifest() {
      const manifest = {
        id: $("plugin-id").value.trim(),
        type: $("plugin-type").value.trim(),
        name: $("plugin-name").value.trim(),
        author: $("plugin-author").value.trim(),
        version: $("plugin-version").value.trim(),
        update_time: new Date().toISOString(),
        desc: $("plugin-desc").value.trim()
      };
      setOptionalField(manifest, "icon", $("plugin-icon").value.trim());
      setOptionalField(manifest, "endpoint", $("plugin-endpoint").value.trim());
      readCustomFields(manifest);
      state.editorManifest = manifest;
      return manifest;
    }
    function setEditorMode(mode) {
      if (mode === state.editorMode) {
        if (mode === "json") renderJSONPreview(state.editorManifest);
        return true;
      }
      try {
        if (mode === "json") renderJSONPreview(readFormManifest());
      } catch (error) {
        showNotice(error.message, "error");
        return false;
      }
      state.editorMode = mode;
      const isForm = mode === "form";
      $("form-editor").hidden = !isForm;
      $("json-editor").hidden = isForm;
      applyFieldLocks(isForm);
      $("form-mode").setAttribute("aria-selected", String(isForm));
      $("json-mode").setAttribute("aria-selected", String(!isForm));
      showNotice(isForm ? "已返回表单编辑。" : "已生成只读 JSON 预览。", "ok");
      return true;
    }
    function validateManifestForm(manifest) {
      const required = [
        ["id", "plugin-id", "请填写插件 ID。"],
        ["type", "plugin-type", "请填写插件类型。"],
        ["name", "plugin-name", "请填写插件名称。"],
        ["author", "plugin-author", "请填写作者。"],
        ["version", "plugin-version", "请填写插件版本。"],
        ["endpoint", "plugin-endpoint", "请填写数据源 URL。"],
        ["desc", "plugin-desc", "请填写插件描述。"]
      ];
      for (const [key, id, message] of required) {
        if (typeof manifest[key] !== "string" || !manifest[key].trim()) return { id, message };
      }
      if (!/^\d+(?:\.\d+)*(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)) {
        return {
          id: "plugin-version",
          message: "版本必须是数字点分格式，例如 1.2.0。"
        };
      }
      return null;
    }
    function setOptionalField(target, key, value) {
      if (value) target[key] = value;
    }
    function stringValue(value) {
      return typeof value === "string" ? value : "";
    }
    function openEditor() {
      $("editor-card").hidden = false;
      $("workspace").classList.add("editor-open");
      state.editorMode = "form";
      $("form-editor").hidden = false;
      $("json-editor").hidden = true;
      $("form-mode").setAttribute("aria-selected", "true");
      $("json-mode").setAttribute("aria-selected", "false");
      applyFieldLocks(true);
    }
    function closeEditor() {
      $("editor-card").hidden = true;
      $("workspace").classList.remove("editor-open");
    }
    function applyFieldLocks(formActive) {
      $("form-editor").querySelectorAll("input, textarea, select").forEach((control) => {
        control.disabled = !formActive;
      });
      if (formActive && state.editingID) {
        $("plugin-id").disabled = true;
        $("plugin-type").disabled = true;
        $("plugin-author").disabled = true;
      }
    }
    function renderCustomFields(manifest) {
      $("custom-fields").replaceChildren();
      for (const [key, value] of Object.entries(manifest)) {
        if (!knownFields.has(key)) appendCustomField(key, value);
      }
      updateCustomEmpty();
    }
    function appendCustomField(key, value) {
      const empty = $("custom-fields").querySelector(".custom-empty");
      if (empty) empty.remove();
      const row = document.createElement("div");
      row.className = "custom-row";
      const keyInput = document.createElement("input");
      keyInput.className = "custom-key";
      keyInput.placeholder = "字段名，例如 ua";
      keyInput.setAttribute("aria-label", "自定义字段名");
      keyInput.value = key;
      const typeSelect = document.createElement("select");
      typeSelect.className = "custom-type";
      typeSelect.setAttribute("aria-label", "自定义字段类型");
      [
        ["string", "文本"], ["number", "数字"],
        ["boolean", "布尔"], ["json", "JSON"]
      ].forEach(([optionValue, label]) => {
        const option = document.createElement("option");
        option.value = optionValue; option.textContent = label; typeSelect.append(option);
      });
      const inferred = inferCustomType(value);
      typeSelect.value = inferred;
      const valueInput = document.createElement("input");
      valueInput.className = "custom-value";
      valueInput.placeholder = inferred === "json" ? "例如 {\\\"enabled\\\":true}" : "字段值";
      valueInput.setAttribute("aria-label", "自定义字段值");
      valueInput.value = serializeCustomValue(value, inferred);
      typeSelect.addEventListener("change", () => {
        valueInput.placeholder = typeSelect.value === "json"
          ? "例如 {\\\"enabled\\\":true}"
          : "字段值";
      });
      const remove = document.createElement("button");
      remove.className = "button danger custom-remove";
      remove.type = "button"; remove.textContent = "移除";
      remove.addEventListener("click", () => {
        row.remove(); updateCustomEmpty();
      });
      row.append(keyInput, typeSelect, valueInput, remove);
      $("custom-fields").append(row);
      if (!key) keyInput.focus();
    }
    function updateCustomEmpty() {
      if ($("custom-fields").querySelector(".custom-row")) return;
      const empty = document.createElement("div");
      empty.className = "custom-empty";
      empty.textContent = "暂无自定义字段";
      $("custom-fields").append(empty);
    }
    function readCustomFields(manifest) {
      const seen = new Set();
      for (const row of $("custom-fields").querySelectorAll(".custom-row")) {
        const key = row.querySelector(".custom-key").value.trim();
        if (!key) throw new Error("自定义字段名不能为空。");
        if (knownFields.has(key)) throw new Error(key + " 是内置字段，不能重复添加。");
        if (seen.has(key)) throw new Error("自定义字段 " + key + " 重复。");
        seen.add(key);
        const type = row.querySelector(".custom-type").value;
        const raw = row.querySelector(".custom-value").value;
        manifest[key] = parseCustomValue(raw, type, key);
      }
    }
    function inferCustomType(value) {
      if (typeof value === "string") return "string";
      if (typeof value === "number") return "number";
      if (typeof value === "boolean") return "boolean";
      return "json";
    }
    function serializeCustomValue(value, type) {
      if (type === "json") return JSON.stringify(value);
      return value === undefined ? "" : String(value);
    }
    function parseCustomValue(raw, type, key) {
      if (type === "string") return raw;
      if (type === "number") {
        const value = Number(raw);
        if (!raw.trim() || !Number.isFinite(value)) {
          throw new Error("自定义字段 " + key + " 不是有效数字。");
        }
        return value;
      }
      if (type === "boolean") {
        if (raw.trim().toLowerCase() === "true") return true;
        if (raw.trim().toLowerCase() === "false") return false;
        throw new Error("自定义字段 " + key + " 的布尔值只能是 true 或 false。");
      }
      try { return JSON.parse(raw); }
      catch { throw new Error("自定义字段 " + key + " 不是有效 JSON。"); }
    }
    function renderJSONPreview(manifest) {
      $("manifest-preview").innerHTML = highlightJSON(JSON.stringify(manifest, null, 2));
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
    function compareVersionStrings(lhs, rhs) {
      const left = lhs.split("-", 1)[0].split(".").map(Number);
      const right = rhs.split("-", 1)[0].split(".").map(Number);
      const length = Math.max(left.length, right.length);
      for (let index = 0; index < length; index += 1) {
        const difference = (left[index] || 0) - (right[index] || 0);
        if (difference !== 0) return difference;
      }
      return 0;
    }
    function requestDelete(item) {
      state.pendingDelete = item;
      $("delete-plugin-name").textContent = item.name + " (" + item.id + ")";
      $("unpublish-reason").value = "";
      $("delete-error").textContent = "";
      $("delete-dialog").showModal();
    }
    async function confirmDelete() {
      const item = state.pendingDelete;
      if (!item) return;
      const reason = $("unpublish-reason").value.trim();
      if (reason.length < 2) {
        $("delete-error").textContent = "下架原因至少需要 2 个字符。";
        return;
      }
      $("confirm-delete").disabled = true;
      try {
        const response = await api(
          "/api/v1/admin/plugins/" + encodeURIComponent(item.id) + "/unpublish",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reason })
          }
        );
        if (!response.ok) throw await responseError(response);
        $("delete-dialog").close();
        if (state.editingID === item.id) closeEditor();
        state.pendingDelete = null;
        state.cursor = null; state.history = []; state.page = 1;
        await loadPlugins();
      } catch (error) {
        $("delete-error").textContent = error.message;
      } finally {
        $("confirm-delete").disabled = false;
      }
    }
    function showNotice(message, kind) {
      $("notice").textContent = message; $("notice").className = "notice " + kind;
    }
    function showReviewNotice(message, kind) {
      $("review-notice").textContent = message;
      $("review-notice").className = "notice " + kind;
    }
    function setBusy(busy) {
      $("refresh").disabled = busy;
      if (busy) $("connection").textContent = "载入中…";
    }
  </script>
</body>
</html>`;

export function adminPage(): Response {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  return new Response(template.replaceAll("__NONCE__", nonce), {
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
  });
}
