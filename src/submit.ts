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
    .field { margin-bottom: 15px; }
    label { display: block; color: #c3d6e4; font-size: 12px; font-weight: 700; margin-bottom: 7px; }
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
    .notice.error { color: var(--danger); }
    .notice.ok { color: var(--accent); }
    .user-bar { padding: 14px 20px; border-bottom: 1px solid var(--line); }
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
    .submission-actions { display: grid; gap: 8px; justify-items: start; }
    .history { color: var(--muted); font-size: 12px; }
    .history summary { cursor: pointer; color: var(--blue); }
    .history ul { margin: 8px 0 0; padding-left: 18px; min-width: 250px; }
    .history li { margin: 5px 0; }
    .plugin-identity { display: flex; align-items: center; gap: 9px; min-width: 190px; }
    .plugin-name { font-weight: 700; }
    .plugin-id { color: var(--muted); font: 11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace; overflow-wrap: anywhere; }
    .market-dot { flex: 0 0 auto; width: 9px; height: 9px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 10px rgba(85,214,190,.75); }
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
    @media (max-width: 760px) {
      .auth-grid,.row { grid-template-columns: 1fr; gap: 0; }
      .custom-row { grid-template-columns: 1fr 90px auto; }
      .custom-value { grid-column: 1 / -1; grid-row: 2; }
      header { align-items: flex-start; }
    }
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
          <div class="field"><label for="login-email">Email</label><input id="login-email" type="email" required></div>
          <div class="field"><label for="login-password">密码</label><input id="login-password" type="password" minlength="8" required></div>
          <button class="button primary" type="submit">登录</button>
          <p class="notice" id="login-notice"></p>
          <p class="switch-link">没有账号？<a href="/register">注册账号</a></p>
        </form>
        <form class="auth-panel" id="register-form" __REGISTER_HIDDEN__>
          <h3>注册账号</h3>
          <div class="field"><label for="register-email">Email</label><input id="register-email" type="email" required></div>
          <div class="field"><label for="register-nick">昵称 / Author</label><input id="register-nick" minlength="2" maxlength="40" required><span class="help">昵称全局唯一，并固定为插件 author。</span></div>
          <div class="field"><label for="register-password">密码</label><input id="register-password" type="password" minlength="8" maxlength="128" required></div>
          <div class="field"><label for="register-password-confirmation">确认密码</label><input id="register-password-confirmation" type="password" minlength="8" maxlength="128" required></div>
          <button class="button primary" type="submit">注册并登录</button>
          <p class="notice" id="register-notice"></p>
          <p class="switch-link">已有账号？<a href="/login">返回登录</a></p>
        </form>
      </div>
    </section>

    <main id="portal" hidden>
      <section class="card">
        <div class="user-bar">
          <div><strong id="user-nick"></strong><p class="subtitle" id="user-email"></p></div>
          <div class="actions">
            <button class="button" id="logout" type="button">退出登录</button>
            <button class="button" id="import-plugins" type="button">批量导入 JSON</button>
            <input id="import-json-file" type="file" accept=".json,application/json" hidden>
            <button class="button" id="submit-all-drafts" type="button" disabled>全部提交审核</button>
            <button class="button primary" id="new-plugin" type="button">新建插件</button>
          </div>
        </div>
        <div class="card-head"><div><h2>我的投稿</h2><p class="subtitle">待审核、已接受和被拒绝的提交记录</p></div><button class="button" id="refresh" type="button">刷新</button></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>插件</th><th>提交版本</th><th>审核状态</th><th>提交时间</th><th>审核说明</th><th></th></tr></thead>
            <tbody id="submission-rows"></tbody>
          </table>
         <div class="empty" id="empty">暂无投稿记录</div>
        </div>
        <p class="notice" id="submission-notice"></p>
      </section>

      <dialog id="editor-dialog">
      <section class="card" id="editor-card">
        <div class="card-head"><div><h2 id="editor-title">新建插件</h2><p class="subtitle">提交后需等待管理员审核</p></div><button class="button" id="close-editor" type="button">关闭</button></div>
        <form id="plugin-form">
          <div class="row">
            <div class="field" id="plugin-id-field"><label for="plugin-id">插件 ID</label><input id="plugin-id" disabled><span class="help">由系统自动生成，无法修改。</span></div>
            <div class="field"><label for="plugin-type">插件类型</label><input id="plugin-type" placeholder="例如 hot" required></div>
          </div>
          <div class="row">
            <div class="field"><label for="plugin-name">名称</label><input id="plugin-name" required></div>
            <div class="field"><label for="plugin-author">Author</label><input id="plugin-author" disabled></div>
          </div>
          <div class="field"><label for="plugin-version">版本</label><input id="plugin-version" placeholder="例如 1.0.0" required><span class="help">更新已上架插件时必须使用更高版本。</span></div>
          <div class="field"><label for="plugin-icon">图标 URL</label><input id="plugin-icon" type="url" placeholder="https://…"></div>
          <div class="field"><label for="plugin-endpoint">数据源 URL</label><input id="plugin-endpoint" type="url" placeholder="https://…"></div>
          <div class="field"><label for="plugin-desc">描述</label><textarea id="plugin-desc" required></textarea></div>
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

  <dialog id="plugin-menu-dialog">
    <div class="dialog-body">
      <h2 id="plugin-menu-title">插件操作</h2>
      <p class="dialog-meta" id="plugin-menu-meta"></p>
      <div class="dialog-history"><ul id="plugin-history-list"></ul></div>
      <p class="notice" id="plugin-menu-notice"></p>
      <div class="dialog-actions">
        <button class="button" id="plugin-menu-close" type="button">关闭</button>
        <button class="button" id="plugin-menu-edit" type="button">编辑</button>
        <button class="button" id="plugin-menu-cancel-review" type="button">取消审核</button>
        <button class="button" id="plugin-menu-unpublish" type="button">下架</button>
        <button class="button danger" id="plugin-menu-delete" type="button">删除插件</button>
      </div>
    </div>
  </dialog>
  <script nonce="__NONCE__">
    const state = { user: null, submissions: [], editing: false, selectedPlugin: null };
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
    $("refresh").addEventListener("click", loadSubmissions);
    $("new-plugin").addEventListener("click", newPlugin);
    $("import-plugins").addEventListener("click", () => $("import-json-file").click());
    $("import-json-file").addEventListener("change", importPlugins);
    $("submit-all-drafts").addEventListener("click", submitAllDrafts);
    $("close-editor").addEventListener("click", closeEditor);
    $("cancel-editor").addEventListener("click", closeEditor);
    $("add-field").addEventListener("click", () => addCustomField("", ""));
    $("plugin-form").addEventListener("submit", submitPlugin);
    $("save-draft").addEventListener("click", saveDraft);
    $("plugin-menu-close").addEventListener("click", closePluginMenu);
    $("plugin-menu-edit").addEventListener("click", () => {
      const item = state.selectedPlugin;
      if (!item) return;
      closePluginMenu();
      editSubmission(item);
    });
    $("plugin-menu-cancel-review").addEventListener("click", () => {
      if (state.selectedPlugin) {
        cancelSubmission(state.selectedPlugin, $("plugin-menu-cancel-review"));
      }
    });
    $("plugin-menu-unpublish").addEventListener("click", () => {
      if (state.selectedPlugin) {
        unpublishPlugin(state.selectedPlugin, $("plugin-menu-unpublish"));
      }
    });
    $("plugin-menu-delete").addEventListener("click", deletePlugin);
    restoreSession();

    async function authenticate(path, body, noticeID) {
      showNotice(noticeID, "", "");
      try {
        const response = await fetch(path, {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        });
        if (!response.ok) throw await responseError(response);
        const result = await response.json();
        showPortal(result.user);
        await loadSubmissions();
      } catch (error) {
        showNotice(noticeID, error.message, "error");
      }
    }

    async function restoreSession() {
      const response = await fetch("/api/v1/user/me", {
        credentials: "same-origin"
      });
      if (!response.ok) return;
      const result = await response.json();
      showPortal(result.user);
      await loadSubmissions();
    }

    function showPortal(user) {
      state.user = user;
      $("auth-card").hidden = true; $("portal").hidden = false;
      $("user-nick").textContent = user.nick;
      $("user-email").textContent = user.email;
    }

    async function loadSubmissions() {
      try {
        const response = await fetch("/api/v1/user/submissions", {
          credentials: "same-origin"
        });
        if (!response.ok) throw await responseError(response);
        state.submissions = (await response.json()).items;
        const draftCount = state.submissions.filter((item) => item.status === "draft").length;
        $("submit-all-drafts").disabled = draftCount === 0;
        $("submit-all-drafts").textContent = draftCount
          ? "全部提交审核 (" + draftCount + ")"
          : "全部提交审核";
        renderSubmissions();
      } catch (error) {
        showNotice("editor-notice", error.message, "error");
      }
    }

    async function submitAllDrafts() {
      const draftCount = state.submissions.filter((item) => item.status === "draft").length;
      if (!draftCount || !confirm(
        "确定将全部 " + draftCount + " 个草稿提交管理员审核？"
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
        showNotice(
          "submission-notice",
          "已提交 " + result.submitted_count + " 个插件，正在等待管理员审核。",
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
      const tbody = $("submission-rows");
      tbody.replaceChildren();
      $("empty").hidden = state.submissions.length > 0;
      for (const item of state.submissions) {
        const row = document.createElement("tr");
        const identity = document.createElement("div");
        identity.className = "plugin-identity";
        if (item.published_version) {
          const dot = document.createElement("span");
          dot.className = "market-dot";
          dot.title = "已有版本上架";
          dot.setAttribute("aria-label", "已有版本上架");
          identity.append(dot);
        }
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
          draft: "草稿"
        }[item.status];
        statusCell.append(badge); row.append(statusCell);
        row.append(cell(new Date(item.submitted_at).toLocaleString()));
        row.append(cell(item.rejection_reason || "—"));
        const action = document.createElement("td");
        const more = document.createElement("button");
        more.className = "button";
        more.type = "button";
        more.textContent = "更多";
        more.addEventListener("click", () => openPluginMenu(item));
        action.append(more);
        row.append(action); tbody.append(row);
      }
    }

    function openPluginMenu(item) {
      state.selectedPlugin = item;
      $("plugin-menu-title").textContent = item.manifest.name;
      $("plugin-menu-meta").textContent =
        item.plugin_id + " · 当前投稿 v" + item.version
        + (item.published_version ? " · 已有版本上架" : "");
      const list = $("plugin-history-list");
      list.replaceChildren();
      for (const record of item.history) {
        const entry = document.createElement("li");
        const status = {
          pending: "待审核",
          accepted: "已接受",
          rejected: "已拒绝",
          cancelled: "已取消"
        }[record.status];
        entry.textContent =
          "v" + record.version + " · " + status + " · "
          + new Date(record.submitted_at).toLocaleString()
          + (record.rejection_reason ? " · " + record.rejection_reason : "");
        list.append(entry);
      }
      if (item.history.length === 0) {
        const empty = document.createElement("li");
        empty.textContent = "尚未提交审核";
        list.append(empty);
      }
      $("plugin-menu-edit").hidden = item.status === "pending";
      $("plugin-menu-edit").textContent = {
        accepted: "编辑",
        rejected: "修改后提交",
        cancelled: "继续编辑",
        draft: "编辑草稿"
      }[item.status] || "编辑";
      $("plugin-menu-cancel-review").hidden = item.status !== "pending";
      $("plugin-menu-unpublish").hidden = !item.published_version;
      $("plugin-menu-delete").disabled = false;
      $("plugin-menu-delete").title = "";
      showNotice("plugin-menu-notice", "", "");
      $("plugin-menu-dialog").showModal();
    }

    function closePluginMenu() {
      state.selectedPlugin = null;
      $("plugin-menu-dialog").close();
    }

    async function deletePlugin() {
      const item = state.selectedPlugin;
      if (!item) return;
      if (!confirm(
        "确定永久删除 " + item.manifest.name
        + "？所有版本、投稿和审核记录都会删除，此操作无法撤销。"
      )) return;
      $("plugin-menu-delete").disabled = true;
      showNotice("plugin-menu-notice", "", "");
      try {
        const response = await fetch(
          "/api/v1/user/plugins/" + encodeURIComponent(item.plugin_id),
          { method: "DELETE", credentials: "same-origin" }
        );
        if (!response.ok) throw await responseError(response);
        closePluginMenu();
        await loadSubmissions();
        showNotice("submission-notice", "插件及其历史记录已删除。", "ok");
      } catch (error) {
        showNotice("plugin-menu-notice", error.message, "error");
        $("plugin-menu-delete").disabled = false;
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
        closePluginMenu();
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
        closePluginMenu();
        await loadSubmissions();
        showNotice("submission-notice", "投稿已取消，现在可以继续编辑。", "ok");
      } catch (error) {
        showNotice("submission-notice", error.message, "error");
        button.disabled = false;
      }
    }

    function newPlugin() {
      state.editing = false;
      populate({
        type: "hot", name: "Example Plugin",
        author: state.user.nick, version: "1.0.0", desc: "Plugin description",
        endpoint: "https://example.com/data.json"
      });
      $("plugin-id-field").hidden = true;
      $("plugin-type").disabled = false;
      $("editor-title").textContent = "新建插件";
      $("minimum-ios").value = ""; $("minimum-tvos").value = "";
      $("platform-ios").checked = true; $("platform-tvos").checked = true;
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
        draft: "编辑草稿 "
      }[item.status] + item.manifest.name;
      $("minimum-ios").value = item.minimum_ios_version || "";
      $("minimum-tvos").value = item.minimum_tvos_version || "";
      $("platform-ios").checked = item.platforms.includes("ios");
      $("platform-tvos").checked = item.platforms.includes("tvos");
      openEditor();
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
      $("plugin-type").value = text(manifest.type);
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
              minimum_ios_version: $("minimum-ios").value.trim() || null,
              minimum_tvos_version: $("minimum-tvos").value.trim() || null
            })
          }
        );
        if (!response.ok) throw await responseError(response);
        await loadSubmissions();
        closeEditor();
        showNotice("submission-notice", "提交成功，插件正在等待管理员审核。", "ok");
      } catch (error) {
        showNotice("editor-notice", error.message, "error");
      } finally {
        $("submit-plugin").disabled = false;
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
            minimum_ios_version: $("minimum-ios").value.trim() || null,
            minimum_tvos_version: $("minimum-tvos").value.trim() || null
          })
        });
        if (!response.ok) throw await responseError(response);
        closeEditor();
        await loadSubmissions();
        showNotice("submission-notice", "草稿已保存，尚未提交审核。", "ok");
      } catch (error) {
        showNotice("editor-notice", error.message, "error");
      } finally {
        $("save-draft").disabled = false;
      }
    }

    function readManifest() {
      const manifest = {
        type: $("plugin-type").value.trim(),
        name: $("plugin-name").value.trim(), author: state.user.nick,
        version: $("plugin-version").value.trim(), desc: $("plugin-desc").value.trim()
      };
      if (state.editing) manifest.id = $("plugin-id").value.trim();
      optional(manifest, "icon", $("plugin-icon").value.trim());
      optional(manifest, "endpoint", $("plugin-endpoint").value.trim());
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
      $(id).textContent = message; $(id).className = "notice " + kind;
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
        mode === "register" ? "创建账号后即可提交插件" : "登录后管理你的插件投稿",
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
