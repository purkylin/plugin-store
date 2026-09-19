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
    body.portal-mode .shell { width: min(1440px, calc(100% - 48px)); max-width: none; min-height: 100vh; min-height: 100dvh; margin: 0 auto; padding: 24px 0 48px; }
    body.portal-mode .shell > header { display: none; }
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
    .contribution-points { display: inline-flex; align-items: center; gap: 5px; padding: 3px 4px; color: var(--muted); white-space: nowrap; }
    .contribution-icon { color: #7f9aab; font-size: 13px; line-height: 1; }
    .contribution-points strong { color: var(--muted); font-size: 12px; font-weight: 600; line-height: 1; }
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
    .plugin-identity > div:last-child { min-width: 0; }
    .plugin-name-row { display: flex; align-items: center; gap: 7px; min-width: 0; }
    .plugin-name { font-weight: 700; }
    .plugin-id { color: var(--muted); font: 11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace; overflow-wrap: anywhere; }
    .market-dot { flex: 0 0 auto; width: 9px; height: 9px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 10px rgba(85,214,190,.75); }
    .plugin-status-icon { width: 34px; flex: 0 0 34px; display: flex; align-items: center; justify-content: center; }
    .plugin-icon { width: 34px; height: 34px; flex: 0 0 34px; display: block; border: 1px solid rgba(164,198,224,.18); border-radius: 9px; object-fit: cover; background: rgba(2,10,19,.45); }
    .plugin-icon-fallback { display: grid; place-items: center; color: #b9a5ff; background: linear-gradient(145deg, rgba(124,101,224,.9), rgba(57,92,157,.95)); font-size: 17px; font-weight: 800; }
    .private-lock { position: relative; flex: 0 0 auto; width: 12px; height: 9px; margin-top: 4px; border-radius: 2px; background: #c6b4ff; }
    .private-lock::before { content: ""; position: absolute; left: 2px; top: -7px; width: 6px; height: 7px; border: 2px solid #c6b4ff; border-bottom: 0; border-radius: 6px 6px 0 0; }
    .menu-trigger { min-width: 38px; padding: 7px 10px; font-size: 18px; line-height: 1; letter-spacing: 2px; }
    .action-menu { position: fixed; z-index: 40; min-width: 176px; padding: 6px; border: 1px solid var(--line); border-radius: 13px; background: #102238; box-shadow: 0 18px 48px rgba(0,0,0,.38); }
    .menu-item { display: block; width: 100%; padding: 9px 11px; border: 0; border-radius: 8px; color: var(--text); background: transparent; text-align: left; }
    .menu-item:disabled { color: var(--muted); opacity: .55; cursor: not-allowed; }
    .menu-item:hover,.menu-item:focus-visible { outline: none; background: rgba(255,255,255,.07); }
    .menu-item.danger { color: #ffc3cb; }
    dialog {
      width: min(620px, calc(100% - 32px)); color: var(--text); border: 1px solid var(--line);
      border-radius: 20px; background: #0b1b2d; box-shadow: var(--shadow); padding: 0;
    }
    dialog::backdrop { background: rgba(2,8,15,.24); backdrop-filter: blur(2px); }
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
    #editor-dialog,#plugin-type-dialog,#push-history-dialog { position: fixed; top: 0; right: 0; bottom: 0; left: auto !important; width: min(720px, 100%); height: 100vh; max-height: none; margin: 0 0 0 auto; border-radius: 20px 0 0 20px; overflow: auto; transform: none; background: rgba(11,27,45,.82); }
    #editor-dialog .card { min-height: 100%; margin: 0; box-shadow: none; border: 0; background: rgba(15,31,51,.78); }
    .plugin-type-options { display: grid; gap: 10px; margin-top: 20px; }
    .plugin-type-option { display: grid; gap: 3px; padding: 15px 16px; border: 1px solid var(--line); border-radius: 13px; color: var(--text); background: rgba(2,10,19,.35); text-align: left; }
    .plugin-type-option:hover,.plugin-type-option:focus-visible { border-color: rgba(85,214,190,.6); outline: none; background: rgba(85,214,190,.08); }
    .plugin-type-option.selected { border-color: var(--accent); background: rgba(85,214,190,.13); box-shadow: inset 3px 0 0 var(--accent); }
    .plugin-type-option strong { font-size: 14px; }
    .plugin-type-option span { color: var(--muted); font-size: 12px; }
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
    .resource-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    .resource-source { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 99px; font-size: 11px; white-space: nowrap; }
    .resource-source.upload { color: var(--accent); background: rgba(85,214,190,.12); }
    .resource-source.url { color: #a9d1ff; background: rgba(108,169,255,.12); }
    .resource-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .resource-actions .button { padding: 6px 9px; font-size: 12px; }
    .resource-url { max-width: 280px; overflow: hidden; color: var(--muted); text-overflow: ellipsis; white-space: nowrap; }
    .resource-settings { margin-top: 18px; border-top: 1px solid var(--line); padding-top: 16px; }
    .resource-settings summary { cursor: pointer; color: var(--blue); font-weight: 700; }
    .resource-settings form { padding: 16px 0 0; }
    .resource-settings .form-actions { justify-content: flex-start; }
    .resource-viewer { max-height: min(62vh, 620px); overflow: auto; margin: 14px 0 0; padding: 16px; border: 1px solid var(--line); border-radius: 12px; color: #dcecff; background: rgba(2,10,19,.72); font: 12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace; white-space: pre; tab-size: 2; }
    .resource-viewer .python-keyword { color: #78c7ff; }
    .resource-viewer .python-string { color: #8ce3bf; }
    .resource-viewer .python-comment { color: #718aa1; font-style: italic; }
    .resource-viewer .python-number { color: #f4bd76; }
    .resource-viewer .python-constant { color: #cf9cff; }
    .compact-table { min-width: 620px; }
    .portal-tabs { display: flex; gap: 6px; padding: 4px; border: 1px solid var(--line); border-radius: 12px; background: rgba(2,10,19,.38); }
    .portal-tab { border: 0; border-radius: 8px; padding: 8px 13px; color: var(--muted); background: transparent; }
    .portal-tab[aria-selected="true"] { color: var(--text); background: rgba(108,169,255,.16); }
    .toast { position: fixed; z-index: 80; right: 24px; bottom: 24px; max-width: min(420px, calc(100% - 48px)); padding: 12px 16px; border: 1px solid rgba(85,214,190,.35); border-radius: 12px; color: var(--text); background: #12352f; box-shadow: 0 16px 38px rgba(0,0,0,.35); opacity: 0; transform: translateY(12px); pointer-events: none; transition: opacity .18s ease, transform .18s ease; }
    .toast.visible { opacity: 1; transform: translateY(0); }
    .toast.error { border-color: rgba(255,125,141,.38); background: #3a1d2a; }
    .dashboard-shell { min-height: calc(100vh - 72px); min-height: calc(100dvh - 72px); overflow: hidden; border: 1px solid var(--line); border-radius: 18px; background: linear-gradient(135deg, #071522 0%, #07111f 55%, #081a26 100%); box-shadow: 0 24px 70px rgba(0,0,0,.22); }
    .dashboard-topbar { min-height: 74px; margin-bottom: 0; padding: 0 26px; justify-content: flex-start; border-bottom: 1px solid var(--line); background: rgba(7,20,34,.86); }
    #logout { margin-left: auto; }
    .mobile-nav-toggle { display: none; width: 38px; height: 38px; padding: 0; border: 1px solid var(--line); border-radius: 10px; color: var(--text); background: rgba(255,255,255,.045); font-size: 20px; line-height: 1; }
    .nav-scrim { display: none; }
    .dashboard-brand { display: flex; align-items: center; gap: 11px; min-width: 208px; }
    .brand-mark { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid rgba(85,214,190,.45); border-radius: 12px; color: var(--accent); background: rgba(85,214,190,.12); font-weight: 800; }
    .dashboard-brand strong { display: block; font-size: 16px; letter-spacing: .02em; }
    .dashboard-brand span { display: block; margin-top: 1px; color: var(--muted); font-size: 11px; }
    .dashboard-account { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .account-avatar { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid rgba(85,214,190,.5); border-radius: 50%; color: #dffcf7; background: rgba(85,214,190,.26); font-weight: 800; }
    .account-copy { min-width: 0; text-align: left; }
    .account-name-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .account-name-row > strong { max-width: 140px; overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
    .account-copy > span { display: block; max-width: 170px; overflow: hidden; color: var(--muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
    .account-name-row .contribution-points { flex: 0 0 auto; }
    .dashboard-layout { display: grid; grid-template-columns: 224px minmax(0, 1fr); min-height: calc(100vh - 146px); min-height: calc(100dvh - 146px); }
    .dashboard-sidebar { padding: 24px 12px; border-right: 1px solid var(--line); background: rgba(4,17,29,.72); }
    .sidebar-group { display: grid; gap: 5px; }
    .sidebar-label { padding: 8px 14px 7px; color: #718aa1; font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    .sidebar-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 14px; border: 1px solid transparent; border-radius: 10px; color: #a9bfd0; background: transparent; text-align: left; }
    .sidebar-item:hover,.sidebar-item:focus-visible { color: var(--text); background: rgba(108,169,255,.08); outline: none; }
    .sidebar-item.active { border-color: rgba(85,214,190,.12); color: var(--accent); background: rgba(85,214,190,.1); box-shadow: inset 3px 0 0 var(--accent); }
    .sidebar-item .sidebar-icon { width: 20px; color: inherit; font-size: 14px; text-align: center; }
    .dashboard-sidebar { display: flex; flex-direction: column; }
    .dashboard-main { min-width: 0; padding: 18px clamp(20px, 4vw, 54px) 60px; }
    .dashboard-content { width: min(1120px, 100%); margin: 0 auto; }
    .portal-panel { margin-bottom: 22px; border-radius: 15px; background: rgba(11,28,45,.68); }
    .portal-panel .card-head { padding: 16px 20px; }
    .portal-panel .body { padding: 20px; }
    .dashboard-content > [data-portal-page="resources"] .card-head { border-bottom: 0; }
    .dashboard-content > [data-portal-page="resources"] .card-head { padding-top: 4px; padding-bottom: 12px; }
    .dashboard-content > [data-portal-page="resources"] { background: transparent; border: 0; box-shadow: none; overflow: visible; }
    .dashboard-content > [data-portal-page="resources"] .body { padding: 0; }
    .resource-table-card { overflow: hidden; border: 1px solid var(--line); border-radius: 15px; background: rgba(11,28,45,.68); }
    .resource-table-card .table-wrap { overflow-x: auto; }
    .resource-table-card table { min-width: 720px; }
    .resource-table-card th { padding-top: 15px; padding-bottom: 15px; background: rgba(18,42,64,.42); }
    .resource-table-card td { padding-top: 15px; padding-bottom: 15px; }
    .resource-table-card tr:last-child td { border-bottom: 0; }
    .resource-identity { display: flex; align-items: center; gap: 10px; min-width: 208px; }
    .resource-type-icon { display: grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border: 1px solid rgba(164,198,224,.18); border-radius: 9px; font-size: 13px; font-weight: 800; letter-spacing: -.04em; }
    .resource-type-icon.py { color: #9fe7ff; background: linear-gradient(145deg, rgba(52,132,184,.9), rgba(39,74,138,.95)); }
    .resource-type-icon.cms { color: #b8f2d7; background: linear-gradient(145deg, rgba(45,150,126,.9), rgba(33,99,104,.95)); }
    .resource-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .resource-name strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .resource-push-history { margin-top: 18px; border: 1px solid var(--line); border-radius: 15px; background: rgba(11,28,45,.68); overflow: hidden; }
    .resource-push-history .card-head { padding: 14px 18px; }
    .resource-push-history .table-wrap { overflow-x: auto; }
    .resource-add-button { padding: 11px 18px; font-size: 14px; }
    .resource-source-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding: 3px; margin-bottom: 18px; border: 1px solid var(--line); border-radius: 10px; background: rgba(2,10,19,.42); }
    .resource-source-tab { border: 0; border-radius: 7px; padding: 10px; color: var(--muted); background: transparent; }
    .resource-source-tab.active { color: var(--text); background: rgba(85,214,190,.17); box-shadow: inset 0 0 0 1px rgba(85,214,190,.38); }
    .file-drop { display: grid; min-height: 190px; place-items: center; align-content: center; gap: 7px; padding: 22px; border: 1px dashed rgba(164,198,224,.35); border-radius: 12px; color: var(--muted); background: rgba(2,10,19,.3); text-align: center; cursor: pointer; transition: border-color .18s ease, background .18s ease; }
    .file-drop:hover,.file-drop.dragging { border-color: var(--accent); background: rgba(85,214,190,.08); }
    .file-drop strong { color: var(--text); font-size: 15px; }
    .file-drop-mark { color: var(--blue); font-size: 30px; line-height: 1; }
    .file-drop small { color: var(--muted); }
    .selected-file { min-height: 18px; margin-top: 8px; color: var(--accent); font-size: 12px; }
    #user-resource-dialog { position: fixed; top: 0; right: 0; left: auto !important; bottom: 0; inset-inline-start: auto; width: min(460px, 100%); height: 100vh; max-height: none; margin: 0 0 0 auto; border-radius: 20px 0 0 20px; transform: none; background: rgba(11,27,45,.82); }
    #user-resource-dialog .dialog-body { display: flex; height: 100%; flex-direction: column; padding: 24px; }
    #user-resource-dialog .card-head { flex: 0 0 auto; padding: 0 0 20px; }
    #user-resource-dialog form { display: flex; min-height: 0; flex: 1; flex-direction: column; padding: 20px 0 0; overflow-y: auto; }
    #user-resource-dialog .row { grid-template-columns: 1fr; gap: 0; }
    #user-resource-dialog .field { margin-bottom: 20px; }
    #user-resource-dialog .form-actions { margin-top: auto; padding-top: 20px; }
    #user-resource-dialog .push-switch { margin-bottom: 18px; }
    @media (max-width: 900px) {
      .dashboard-topbar { padding: 0 18px; }
      .dashboard-brand { min-width: auto; }
      .dashboard-brand span { display: none; }
      .dashboard-account { min-width: auto; }
      .dashboard-layout { grid-template-columns: 180px minmax(0,1fr); }
    }
    @media (max-width: 760px) {
      body.portal-mode { height: 100dvh; min-height: 100dvh; overflow: hidden; }
      body.portal-mode .shell { width: 100%; margin: 0; padding: 0; }
      .dashboard-topbar { position: sticky; top: 0; z-index: 50; height: 66px; min-height: 66px; flex: 0 0 66px; align-items: center; padding: 0 14px; }
      .mobile-nav-toggle { display: grid; place-items: center; flex: 0 0 auto; }
      .dashboard-brand { min-width: 0; }
      .dashboard-brand strong { font-size: 14px; }
      .dashboard-account { min-width: 0; flex: 1 1 auto; gap: 7px; }
      .account-copy > span { display: block; max-width: 140px; font-size: 10px; line-height: 1.25; }
      .account-name-row { gap: 5px; }
      .account-name-row > strong { max-width: 118px; }
      .contribution-points { padding: 3px 0; }
      #logout { flex: 0 0 auto; }
      .dashboard-layout { display: block; min-height: 0; flex: 1 1 auto; overflow: hidden; }
      .dashboard-shell { display: flex; height: 100dvh; min-height: 0; flex-direction: column; border: 0; border-radius: 0; box-shadow: none; }
      .dashboard-sidebar { position: fixed; top: 66px; bottom: 0; left: 0; z-index: 60; display: flex; width: min(284px, 84vw); padding: 22px 12px; border-right: 1px solid var(--line); border-bottom: 0; transform: translateX(-105%); transition: transform .2s ease; overflow-y: auto; box-shadow: 18px 0 42px rgba(0,0,0,.28); }
      .dashboard-shell.nav-open .dashboard-sidebar { transform: translateX(0); }
      .dashboard-shell.nav-open .nav-scrim { display: block; position: fixed; inset: 66px 0 0; z-index: 55; border: 0; background: rgba(2,8,15,.58); }
      .sidebar-group { display: grid; gap: 5px; }
      .sidebar-item { justify-content: flex-start; padding: 12px 14px; font-size: 14px; }
      .sidebar-item .sidebar-icon { display: block; }
      .dashboard-main { height: 100%; min-height: 0; overflow-y: auto; padding: 14px 12px 44px; }
      .portal-panel { margin-bottom: 22px; }
      .auth-grid,.row { grid-template-columns: 1fr; gap: 0; }
      .custom-row { grid-template-columns: 1fr 90px auto; }
      .custom-value { grid-column: 1 / -1; grid-row: 2; }
      header { align-items: flex-start; }
      #user-resource-dialog,#plugin-type-dialog,#editor-dialog,#push-history-dialog { top: auto; right: 0; bottom: 0; width: 100%; height: min(92vh, 760px); border-radius: 18px 18px 0 0; margin: 0; }
      .resource-table-card .table-wrap { overflow: visible; }
      .resource-table-card table { display: block; min-width: 0; }
      .resource-table-card thead { display: none; }
      .resource-table-card tbody { display: grid; }
      .resource-table-card tr { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; padding: 12px 14px; border-bottom: 1px solid var(--line); }
      .resource-table-card tr:last-child { border-bottom: 0; }
      .resource-table-card td { display: flex; align-items: center; gap: 7px; min-width: 0; padding: 6px 0; border: 0; font-size: 12px; }
      .resource-table-card td:first-child { grid-column: 1 / -1; padding: 4px 46px 10px 0; }
      .resource-table-card td:nth-child(2)::before { content: "来源"; color: var(--muted); font-size: 11px; }
      .resource-table-card td:nth-child(3)::before { content: "状态"; color: var(--muted); font-size: 11px; }
      .resource-table-card td:nth-child(4)::before { content: "更新"; color: var(--muted); font-size: 11px; }
      .resource-table-card td:nth-child(5) { position: absolute; top: 12px; right: 14px; padding: 0; }
      .resource-table-card td:nth-child(4) { grid-column: 1 / -1; }
      .resource-table-card .resource-source { max-width: calc(100% - 34px); overflow: hidden; text-overflow: ellipsis; }
      .portal-panel[data-portal-page="plugins"] .card-head { display: block; padding: 18px 14px 14px; }
      .portal-panel[data-portal-page="plugins"] .card-head > div:first-child { margin-bottom: 14px; }
      .portal-panel[data-portal-page="plugins"] .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
      .portal-panel[data-portal-page="plugins"] .actions .button { width: 100%; }
      .portal-panel[data-portal-page="plugins"] .table-wrap { overflow: visible; }
      .portal-panel[data-portal-page="plugins"] table { display: block; min-width: 0; }
      .portal-panel[data-portal-page="plugins"] thead { display: none; }
      .portal-panel[data-portal-page="plugins"] tbody { display: grid; }
      .portal-panel[data-portal-page="plugins"] tr { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0 12px; padding: 14px; border-bottom: 1px solid var(--line); }
      .portal-panel[data-portal-page="plugins"] tr:last-child td { border-bottom: 0; }
      .portal-panel[data-portal-page="plugins"] td { display: flex; align-items: center; min-width: 0; padding: 6px 0; border: 0; font-size: 12px; }
      .portal-panel[data-portal-page="plugins"] td:first-child { grid-column: 1 / -1; padding: 2px 42px 12px 0; }
      .portal-panel[data-portal-page="plugins"] td:nth-child(2)::before { content: "版本"; margin-right: 7px; color: var(--muted); font-size: 11px; }
      .portal-panel[data-portal-page="plugins"] td:nth-child(3) { justify-content: flex-end; }
      .portal-panel[data-portal-page="plugins"] td:nth-child(4) { grid-column: 1 / -1; color: var(--muted); }
      .portal-panel[data-portal-page="plugins"] td:nth-child(4)::before { content: "提交"; margin-right: 7px; color: var(--muted); font-size: 11px; }
      .portal-panel[data-portal-page="plugins"] td:nth-child(5) { grid-column: 1 / -1; display: block; overflow: hidden; color: var(--muted); text-overflow: ellipsis; white-space: nowrap; }
      .portal-panel[data-portal-page="plugins"] td:nth-child(5)::before { content: "说明"; margin-right: 7px; color: var(--muted); font-size: 11px; }
      .portal-panel[data-portal-page="plugins"] td:nth-child(6) { position: absolute; top: 14px; right: 14px; padding: 0; }
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
      <div class="dashboard-shell">
        <header class="dashboard-topbar">
          <button class="mobile-nav-toggle" id="mobile-nav-toggle" type="button" aria-label="打开导航" aria-expanded="false">☰</button>
          <div class="dashboard-account"><div class="account-avatar" id="user-avatar">U</div><div class="account-copy"><div class="account-name-row"><strong id="user-nick"></strong><span class="contribution-points" title="贡献值"><span class="contribution-icon" aria-hidden="true">✦</span><strong id="contribution-points">0</strong></span></div><span id="user-email"></span></div></div>
          <button class="button" id="logout" type="button">退出</button>
        </header>
        <button class="nav-scrim" id="nav-scrim" type="button" aria-label="关闭导航"></button>
        <div class="dashboard-layout">
          <aside class="dashboard-sidebar">
            <nav class="sidebar-group" role="tablist" aria-label="用户中心">
              <button class="sidebar-item" id="portal-plugins-tab" data-portal-nav="plugins" type="button" role="tab" aria-selected="true"><span class="sidebar-icon">▦</span>我的插件</button>
              <button class="sidebar-item" id="portal-resources-tab" data-portal-nav="resources" type="button" role="tab" aria-selected="false"><span class="sidebar-icon">◈</span>资源管理</button>
              <button class="sidebar-item" id="portal-settings-tab" data-portal-nav="settings" type="button"><span class="sidebar-icon">⚙</span>配置管理</button>
            </nav>
          </aside>
          <div class="dashboard-main">
            <div class="dashboard-content">
      <section class="card portal-panel" id="resource-card" data-portal-page="resources" hidden>
        <div class="card-head"><div><h2>资源管理</h2></div><div class="actions"><button class="button" id="open-push-history" type="button">Push 记录</button><button class="button primary resource-add-button" id="new-user-resource" type="button">＋ 添加资源</button></div></div>
        <div class="body">
          <div class="resource-table-card"><div class="table-wrap"><table class="compact-table"><thead><tr><th>资源</th><th>来源</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody id="resource-rows"></tbody></table><div class="empty" id="resource-empty">暂无资源，先添加一个 Python 或 CMS 资源。</div></div></div>
        </div>
      </section>
      <section class="card portal-panel settings-panel" id="settings-card" data-portal-page="settings" hidden>
        <div class="card-head"><div><h2>TVBox 配置与插件同步</h2><p class="subtitle">资源列表只负责管理资源，配置生成和插件同步在这里完成。</p></div></div>
        <div class="body">
          <form id="user-tvbox-settings-form">
            <div class="row"><div class="field"><label for="user-tvbox-plugin-id">关联已上架插件 ID</label><input id="user-tvbox-plugin-id" placeholder="可选，只能关联自己的已上架插件"><span class="help">用户资源默认只生成配置；关联插件后可以手动同步插件版本。</span></div><div class="field"><label>配置地址</label><input id="user-tvbox-config-url" readonly placeholder="生成配置后显示"></div></div>
            <div class="field"><label class="required" for="user-tvbox-template">TVBox 模板 JSON</label><textarea id="user-tvbox-template" style="min-height:180px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace"></textarea><span class="help">服务端只替换 sites 字段，远程 Python 和 CMS 地址不会被服务器下载。</span></div>
            <div class="form-actions"><button class="button" id="user-tvbox-save-settings" type="submit">保存设置</button><button class="button" id="user-tvbox-generate" type="button">仅生成配置</button><button class="button primary" id="user-tvbox-sync" type="button">生成并同步插件</button></div>
            <p class="notice" id="user-tvbox-settings-notice"></p>
          </form>
        </div>
      </section>
      <section class="card portal-panel" data-portal-page="plugins">
        <div class="card-head"><div><h2>我的插件</h2><p class="subtitle">管理公开投稿和仅供手动导入的私有插件</p></div><div class="actions"><button class="button" id="import-plugins" type="button">批量导入 JSON</button><input id="import-json-file" type="file" accept=".json,application/json" hidden><button class="button primary" id="new-plugin" type="button">新建插件</button></div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>插件</th><th>提交版本</th><th>审核状态</th><th>提交时间</th><th>审核说明</th><th></th></tr></thead>
            <tbody id="submission-rows"></tbody>
          </table>
         <div class="empty" id="empty">暂无投稿记录</div>
        </div>
      </section>

      <dialog id="plugin-type-dialog">
        <div class="dialog-body">
          <div class="card-head"><div><h2>选择插件类型</h2><p class="subtitle">先选择类型，再填写插件信息。</p></div><button class="button" id="close-plugin-type" type="button">关闭</button></div>
          <div class="plugin-type-options" id="plugin-type-options"></div>
          <div class="dialog-actions"><button class="button" id="cancel-plugin-type" type="button">取消</button><button class="button primary" id="confirm-plugin-type" type="button" disabled>继续</button></div>
          <p class="notice" id="plugin-type-notice"></p>
        </div>
      </dialog>

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
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>

  <div class="action-menu" id="plugin-action-menu" role="menu" hidden></div>
  <div class="action-menu" id="resource-action-menu" role="menu" hidden></div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <dialog id="push-history-dialog">
    <div class="dialog-body">
      <div class="card-head"><div><h2>审核 Push 记录</h2><p class="subtitle">提交到公共资源池，等待管理员审核</p></div><button class="button" id="close-push-history" type="button">关闭</button></div>
      <div class="resource-push-history" id="push-card">
        <div class="table-wrap"><table class="compact-table"><thead><tr><th>资源</th><th>类型</th><th>状态</th><th>提交时间</th><th>说明</th><th>操作</th></tr></thead><tbody id="push-rows"></tbody></table><div class="empty" id="push-empty">暂无 Push 记录</div></div>
      </div>
    </div>
  </dialog>
  <dialog id="user-resource-dialog">
    <div class="dialog-body">
      <div class="card-head"><div><h2 id="user-resource-dialog-title">添加资源</h2><p class="subtitle">Python 支持上传文件或保存远程地址；CMS 直接保存地址。</p></div><button class="button" id="close-user-resource" type="button">关闭</button></div>
      <form id="user-resource-form">
        <div class="push-switch"><button class="button active" id="user-resource-type-py" type="button">Python</button><button class="button" id="user-resource-type-cms" type="button">CMS</button></div>
        <div id="user-resource-py-fields">
          <div class="field"><label>来源方式</label><div class="resource-source-tabs" role="tablist" aria-label="Python 来源"><button class="resource-source-tab active" id="user-resource-source-file" type="button" role="tab" aria-selected="true">↥ 上传文件</button><button class="resource-source-tab" id="user-resource-source-url" type="button" role="tab" aria-selected="false">⌁ 输入地址</button></div><input id="user-resource-py-source" type="hidden" value="file"></div>
          <div class="field" id="user-resource-file-field"><label class="required" for="user-resource-file">Python 文件</label><label class="file-drop" id="user-resource-file-drop" for="user-resource-file"><span class="file-drop-mark" id="user-resource-file-icon">↥</span><strong id="user-resource-file-title">点击选择 Python 文件</strong><span id="user-resource-file-hint">或将文件拖拽到此处</span><small id="user-resource-file-limit">仅支持 .py 文件，单个文件不超过 2 MB</small><input id="user-resource-file" type="file" accept=".py,text/x-python" hidden></label><div class="selected-file" id="user-resource-file-name">尚未选择文件</div></div>
          <div class="field" id="user-resource-url-field" hidden><label class="required" for="user-resource-url">Python URL</label><input id="user-resource-url" type="url" placeholder="https://example.com/script.py"></div>
          <div class="field" id="user-resource-url-name-field" hidden><label for="user-resource-url-name">显示名称</label><input id="user-resource-url-name" maxlength="255" placeholder="可选，默认从地址文件名获取"></div>
        </div>
        <div id="user-resource-cms-fields" hidden><div class="row"><div class="field"><label class="required" for="user-resource-cms-name">CMS 名称</label><input id="user-resource-cms-name" maxlength="100"></div><div class="field"><label class="required" for="user-resource-cms-url">CMS URL</label><input id="user-resource-cms-url" type="url" placeholder="https://example.com/api.php/provide/vod/"></div></div></div>
        <div class="checks"><label><input id="user-resource-adult" type="checkbox"> 包含 🔞 内容</label></div>
        <div class="form-actions"><button class="button" id="cancel-user-resource" type="button">取消</button><button class="button primary" id="user-resource-submit" type="submit">添加资源</button></div>
        <p class="notice" id="user-resource-notice"></p>
      </form>
    </div>
  </dialog>
  <dialog id="user-resource-view-dialog">
    <div class="dialog-body"><div class="card-head"><div><h2 id="user-resource-view-title">查看资源</h2><p class="subtitle" id="user-resource-view-meta"></p></div><button class="button" id="close-user-resource-view" type="button">关闭</button></div><pre class="resource-viewer" id="user-resource-view-content"></pre><div class="dialog-actions"><button class="button" id="user-resource-copy" type="button">复制内容</button><button class="button primary" id="user-resource-view-close" type="button">完成</button></div><p class="notice" id="user-resource-view-notice"></p></div>
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
    const portalPageStorageKey = "hawk-plugin-store.portal-page";
    const portalPages = new Set(["plugins", "resources", "settings"]);
    const state = {
      user: null, submissions: [], pushes: [], resources: [], tvboxSettings: null,
      userResourceType: "py", userResourceEditing: null,
      portalPage: readStoredPortalPage(), pluginTypes: [], editing: false, selectedPluginType: null, actionTrigger: null, resourceActionTrigger: null
    };
    const $ = (id) => document.getElementById(id);
    const known = new Set(["id","type","icon","name","author","version","update_time","desc","endpoint"]);

    function readStoredPortalPage() {
      try {
        const page = localStorage.getItem(portalPageStorageKey);
        return portalPages.has(page) ? page : "plugins";
      } catch {
        return "plugins";
      }
    }

    function storePortalPage(page) {
      try { localStorage.setItem(portalPageStorageKey, page); } catch { /* Storage may be unavailable. */ }
    }

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
      setMobileNavigation(false);
      document.body.classList.remove("portal-mode");
      $("portal").hidden = true; $("auth-card").hidden = false;
    });
    $("mobile-nav-toggle").addEventListener("click", () => setMobileNavigation(!document.querySelector(".dashboard-shell").classList.contains("nav-open")));
    $("nav-scrim").addEventListener("click", () => setMobileNavigation(false));
    $("portal-plugins-tab").addEventListener("click", () => { switchPortalPage("plugins"); setMobileNavigation(false); });
    $("portal-resources-tab").addEventListener("click", () => { switchPortalPage("resources"); setMobileNavigation(false); });
    $("portal-settings-tab").addEventListener("click", () => { switchPortalPage("settings"); setMobileNavigation(false); });
    $("close-push-history").addEventListener("click", closePushHistory);
    $("open-push-history").addEventListener("click", openPushHistory);
    $("new-user-resource").addEventListener("click", () => openUserResourceDialog());
    $("close-user-resource").addEventListener("click", closeUserResourceDialog);
    $("cancel-user-resource").addEventListener("click", closeUserResourceDialog);
    $("user-resource-type-py").addEventListener("click", () => setUserResourceType("py"));
    $("user-resource-type-cms").addEventListener("click", () => setUserResourceType("cms"));
    $("user-resource-source-file").addEventListener("click", () => setUserResourceSource("file"));
    $("user-resource-source-url").addEventListener("click", () => setUserResourceSource("url"));
    $("user-resource-file").addEventListener("change", updateSelectedUserResourceFile);
    $("user-resource-file-drop").addEventListener("dragover", (event) => { event.preventDefault(); $("user-resource-file-drop").classList.add("dragging"); });
    $("user-resource-file-drop").addEventListener("dragleave", () => $("user-resource-file-drop").classList.remove("dragging"));
    $("user-resource-file-drop").addEventListener("drop", (event) => {
      event.preventDefault();
      $("user-resource-file-drop").classList.remove("dragging");
      const files = event.dataTransfer?.files;
      if (!files?.length) return;
      const transfer = new DataTransfer(); transfer.items.add(files[0]); $("user-resource-file").files = transfer.files;
      updateSelectedUserResourceFile();
    });
    $("user-resource-form").addEventListener("submit", submitUserResource);
    $("close-user-resource-view").addEventListener("click", closeUserResourceViewer);
    $("user-resource-view-close").addEventListener("click", closeUserResourceViewer);
    $("user-resource-copy").addEventListener("click", copyUserResourceContent);
    $("user-tvbox-settings-form").addEventListener("submit", saveUserTVBoxSettingsForm);
    $("user-tvbox-generate").addEventListener("click", () => generateUserTVBox(false));
    $("user-tvbox-sync").addEventListener("click", () => generateUserTVBox(true));
    $("new-plugin").addEventListener("click", newPlugin);
    $("close-plugin-type").addEventListener("click", closePluginTypeDialog);
    $("cancel-plugin-type").addEventListener("click", closePluginTypeDialog);
    $("confirm-plugin-type").addEventListener("click", confirmPluginType);
    $("import-plugins").addEventListener("click", () => $("import-json-file").click());
    $("import-json-file").addEventListener("change", importPlugins);
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
      const pluginMenu = $("plugin-action-menu");
      const resourceMenu = $("resource-action-menu");
      if (!pluginMenu.hidden && !pluginMenu.contains(event.target) && event.target !== state.actionTrigger) {
        closePluginMenu();
      }
      if (!resourceMenu.hidden && !resourceMenu.contains(event.target) && event.target !== state.resourceActionTrigger) {
        closeResourceMenu();
      }
    });
    window.addEventListener("resize", () => { closePluginMenu(); closeResourceMenu(); });
    window.addEventListener("scroll", () => { closePluginMenu(); closeResourceMenu(); }, true);
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
      setMobileNavigation(false);
      document.body.classList.add("portal-mode");
      $("auth-card").hidden = true; $("portal").hidden = false;
      updateUserSummary(user);
      switchPortalPage(state.portalPage);
    }

    function updateUserSummary(user) {
      $("user-nick").textContent = user.nick;
      $("user-email").textContent = user.email;
      $("user-avatar").textContent = (user.nick || user.email || "U").trim().slice(0, 1).toUpperCase();
      $("contribution-points").textContent = new Intl.NumberFormat().format(user.contribution_points ?? 0);
    }

    function switchPortalPage(page) {
      const nextPage = portalPages.has(page) ? page : "plugins";
      state.portalPage = nextPage;
      storePortalPage(nextPage);
      document.querySelectorAll("[data-portal-page]").forEach((section) => {
        section.hidden = section.dataset.portalPage !== nextPage;
      });
      document.querySelectorAll("[data-portal-nav]").forEach((item) => item.classList.toggle("active", item.dataset.portalNav === nextPage));
      $("portal-plugins-tab").setAttribute("aria-selected", nextPage === "plugins" ? "true" : "false");
      $("portal-resources-tab").setAttribute("aria-selected", nextPage === "resources" ? "true" : "false");
    }

    function setMobileNavigation(open) {
      const shell = document.querySelector(".dashboard-shell");
      if (!shell) return;
      shell.classList.toggle("nav-open", open);
      $("mobile-nav-toggle").setAttribute("aria-expanded", open ? "true" : "false");
      $("mobile-nav-toggle").setAttribute("aria-label", open ? "关闭导航" : "打开导航");
    }

    async function loadPortalData() {
      await Promise.all([loadSubmissions(), loadPushes(), loadUserResources(), loadUserTVBoxSettings(), loadPluginTypes(), loadCurrentUser()]);
    }

    async function loadCurrentUser() {
      const response = await fetch("/api/v1/user/me", { credentials: "same-origin" });
      if (!response.ok) throw await responseError(response);
      const result = await response.json();
      state.user = result.user;
      updateUserSummary(result.user);
    }


    async function loadPushes() {
      const response = await fetch("/api/v1/user/pushes?page=1&page_size=100", { credentials: "same-origin" });
      if (!response.ok) throw await responseError(response);
      state.pushes = (await response.json()).items;
      renderPushRows($("push-rows"), state.pushes);
      $("push-empty").hidden = state.pushes.length > 0;
      $("open-push-history").textContent = state.pushes.length ? "Push 记录 (" + state.pushes.length + ")" : "Push 记录";
    }

    async function openPushHistory() {
      $("push-history-dialog").showModal();
      try {
        await loadPushes();
      } catch (error) {
        showNotice("push-notice", error.message, "error");
      }
    }

    function closePushHistory() {
      if ($("push-history-dialog").open) $("push-history-dialog").close();
    }

    async function loadUserResources() {
      const response = await fetch("/api/v1/user/tvbox/resources", { credentials: "same-origin" });
      if (!response.ok) throw await responseError(response);
      const result = await response.json();
      state.resources = result.items || [];
      renderUserResources(result);
    }

    async function loadUserTVBoxSettings() {
      const response = await fetch("/api/v1/user/tvbox/settings", { credentials: "same-origin" });
      if (!response.ok) throw await responseError(response);
      state.tvboxSettings = await response.json();
      $("user-tvbox-plugin-id").value = state.tvboxSettings.linked_plugin_id || "";
      $("user-tvbox-template").value = JSON.stringify(state.tvboxSettings.template || { sites: [] }, null, 2);
      const existingConfigURL = $("user-tvbox-config-url").value;
      $("user-tvbox-config-url").value = state.tvboxSettings.config_sha256
        ? location.origin + "/tvbox/user/" + encodeURIComponent(state.tvboxSettings.public_key) + "/config.json?v=" + encodeURIComponent(state.tvboxSettings.config_sha256)
        : existingConfigURL && existingConfigURL !== "尚未生成配置" ? existingConfigURL : "尚未生成配置";
      const sync = state.tvboxSettings.plugin_sync_status;
      showNotice("user-tvbox-settings-notice", sync ? "插件同步状态：" + sync + (state.tvboxSettings.plugin_sync_error ? "，" + state.tvboxSettings.plugin_sync_error : "") : "", sync === "failed" ? "error" : "");
    }

    function renderUserResources(result) {
      const tbody = $("resource-rows");
      tbody.replaceChildren();
      const visibleResources = state.resources;
      $("resource-empty").hidden = visibleResources.length > 0;
      $("resource-empty").textContent = "暂无资源，先添加一个 Python 或 CMS 资源。";
      visibleResources.forEach((item) => {
        const index = state.resources.findIndex((value) => value.id === item.id);
        const row = document.createElement("tr");
        const typeIcon = document.createElement("span");
        typeIcon.className = "resource-type-icon " + (item.resource_type === "py" ? "py" : "cms");
        typeIcon.textContent = item.resource_type === "py" ? "Py" : "C";
        typeIcon.title = item.resource_type === "py" ? "Python" : "CMS";
        typeIcon.setAttribute("aria-label", item.resource_type === "py" ? "Python" : "CMS");
        const name = document.createElement("strong"); name.textContent = item.name + (item.is_adult ? " 🔞" : "");
        const nameSlot = document.createElement("div"); nameSlot.className = "resource-identity";
        const nameText = document.createElement("div"); nameText.className = "resource-name"; nameText.append(name);
        nameSlot.append(typeIcon, nameText);
        row.append(cell(nameSlot));
        const source = document.createElement("span"); source.className = "resource-source " + item.source_type; source.textContent = item.source_type === "upload" ? "本地文件" : "远程地址";
        row.append(cell(source));
        const status = document.createElement("span"); status.className = "badge " + (item.enabled ? "accepted" : "cancelled"); status.textContent = item.enabled ? "已启用" : "已禁用";
        row.append(cell(status));
        row.append(cell(new Date(item.updated_at).toLocaleString()));
        const action = document.createElement("td");
        const more = document.createElement("button");
        more.className = "button menu-trigger";
        more.type = "button";
        more.textContent = "•••";
        more.title = "更多操作";
        more.setAttribute("aria-label", item.name + " 更多操作");
        more.setAttribute("aria-haspopup", "menu");
        more.setAttribute("aria-expanded", "false");
        more.addEventListener("click", (event) => {
          event.stopPropagation();
          openResourceMenu(item, more, index);
        });
        action.append(more);
        row.append(action); tbody.append(row);
      });
    }

    function openResourceMenu(item, trigger, index) {
      const menu = $("resource-action-menu");
      if (!menu.hidden && state.resourceActionTrigger === trigger) {
        closeResourceMenu();
        return;
      }
      closePluginMenu();
      closeResourceMenu();
      state.resourceActionTrigger = trigger;
      trigger.setAttribute("aria-expanded", "true");
      menu.replaceChildren();
      const addAction = (label, action, danger = false) => {
        const button = document.createElement("button");
        button.className = "menu-item" + (danger ? " danger" : "");
        button.type = "button";
        button.role = "menuitem";
        button.textContent = label;
        button.addEventListener("click", () => {
          closeResourceMenu();
          action();
        });
        menu.append(button);
        return button;
      };
      if (item.source_type === "upload") {
        addAction("查看内容", () => openUserResourceViewer(item));
        addAction("替换文件", () => replaceUserResource(item));
      } else {
        addAction("编辑配置", () => openUserResourceDialog(item));
      }
      const pushAction = addAction(
        item.pushed ? "已 Push" : "Push",
        () => pushUserResource(item),
      );
      pushAction.disabled = item.pushed;
      pushAction.title = item.pushed ? "这个资源已经 Push 过" : "提交此资源等待审核";
      addAction(item.enabled ? "停用资源" : "启用资源", () => toggleUserResource(item));
      if (index > 0) addAction("上移", () => moveUserResource(item, -1));
      if (index < state.resources.length - 1) addAction("下移", () => moveUserResource(item, 1));
      addAction("删除资源", () => deleteUserResource(item), true);
      menu.hidden = false;
      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      menu.style.left = Math.max(8, Math.min(triggerRect.right - menuRect.width, window.innerWidth - menuRect.width - 8)) + "px";
      menu.style.top = Math.max(8, Math.min(triggerRect.bottom + 6, window.innerHeight - menuRect.height - 8)) + "px";
    }

    async function pushUserResource(item) {
      if (item.pushed) return;
      try {
        const response = await fetch("/api/v1/user/tvbox/resources/" + encodeURIComponent(item.id) + "/push", { method: "POST", credentials: "same-origin" });
        if (!response.ok) throw await responseError(response);
        await Promise.all([loadUserResources(), loadPushes()]);
        showNotice("push-notice", "资源已提交审核。", "ok");
      } catch (error) {
        showNotice("push-notice", error.message, "error");
      }
    }

    function setUserResourceType(type) {
      state.userResourceType = type;
      $("user-resource-py-fields").hidden = type !== "py";
      $("user-resource-cms-fields").hidden = type !== "cms";
      $("user-resource-type-py").classList.toggle("active", type === "py");
      $("user-resource-type-cms").classList.toggle("active", type === "cms");
    }

    function setUserResourceSource(source) {
      $("user-resource-py-source").value = source;
      updateUserResourceSource();
    }

    function updateUserResourceSource() {
      const upload = $("user-resource-py-source").value === "file";
      $("user-resource-file-field").hidden = !upload;
      $("user-resource-url-field").hidden = upload;
      $("user-resource-url-name-field").hidden = upload;
      $("user-resource-source-file").classList.toggle("active", upload);
      $("user-resource-source-url").classList.toggle("active", !upload);
      $("user-resource-source-file").setAttribute("aria-selected", upload ? "true" : "false");
      $("user-resource-source-url").setAttribute("aria-selected", upload ? "false" : "true");
    }

    function updateSelectedUserResourceFile() {
      const file = $("user-resource-file").files[0];
      $("user-resource-file-icon").textContent = file ? "✓" : "↥";
      $("user-resource-file-title").textContent = file ? file.name : "点击选择 Python 文件";
      $("user-resource-file-hint").textContent = file ? "已选择文件，点击可重新选择" : "或将文件拖拽到此处";
      $("user-resource-file-limit").textContent = file ? "文件大小 " + formatBytes(file.size) + " · 单个文件不超过 2 MB" : "仅支持 .py 文件，单个文件不超过 2 MB";
      $("user-resource-file-name").textContent = file ? file.name + " · " + formatBytes(file.size) : "尚未选择文件";
    }

    function openUserResourceDialog(item = null) {
      state.userResourceEditing = item;
      $("user-resource-dialog-title").textContent = item ? "编辑配置" : "添加资源";
      $("user-resource-submit").textContent = item ? (item.source_type === "upload" ? "替换文件" : "保存配置") : "添加资源";
      $("user-resource-form").reset();
      $("user-resource-adult").checked = item?.is_adult === true;
      setUserResourceType(item?.resource_type || "py");
      setUserResourceSource(item ? (item.source_type === "upload" ? "file" : "url") : "file");
      updateSelectedUserResourceFile();
      if (item) {
        $("user-resource-url").value = item.source_url || "";
        $("user-resource-url-name").value = item.name || "";
        $("user-resource-cms-name").value = item.name || "";
        $("user-resource-cms-url").value = item.source_url || "";
      }
      showNotice("user-resource-notice", "", "");
      $("user-resource-dialog").showModal();
    }

    function closeUserResourceDialog() { if ($("user-resource-dialog").open) $("user-resource-dialog").close(); }

    async function submitUserResource(event) {
      event.preventDefault();
      const button = $("user-resource-submit"); button.disabled = true; showNotice("user-resource-notice", "正在保存…", "");
      try {
        let response;
        if (state.userResourceEditing) {
          const resourcePath = "/api/v1/user/tvbox/resources/" + encodeURIComponent(state.userResourceEditing.id);
          if (state.userResourceEditing.source_type === "upload") {
            const file = $("user-resource-file").files[0];
            if (!file) throw new Error("请选择要替换的 Python 文件。");
            const form = new FormData();
            form.append("file", file);
            form.append("is_adult", $("user-resource-adult").checked ? "true" : "false");
            response = await fetch(resourcePath, { method: "PUT", credentials: "same-origin", body: form });
          } else {
            response = await fetch(resourcePath, {
              method: "PUT", credentials: "same-origin", headers: { "content-type": "application/json" },
              body: JSON.stringify({ url: state.userResourceType === "cms" ? $("user-resource-cms-url").value.trim() : $("user-resource-url").value.trim(), name: state.userResourceType === "cms" ? $("user-resource-cms-name").value.trim() : $("user-resource-url-name").value.trim(), is_adult: $("user-resource-adult").checked })
            });
          }
        } else if (state.userResourceType === "py") {
          const form = new FormData();
          if ($("user-resource-py-source").value === "file") {
            const file = $("user-resource-file").files[0]; if (!file) throw new Error("请选择一个 .py 文件。"); form.append("file", file);
          } else {
            const url = $("user-resource-url").value.trim(); if (!url) throw new Error("请填写 Python URL。"); form.append("url", url); form.append("name", $("user-resource-url-name").value.trim());
          }
          form.append("is_adult", $("user-resource-adult").checked ? "true" : "false");
          response = await fetch("/api/v1/user/tvbox/resources/py", { method: "POST", credentials: "same-origin", body: form });
        } else {
          response = await fetch("/api/v1/user/tvbox/resources/cms", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: $("user-resource-cms-name").value.trim(), url: $("user-resource-cms-url").value.trim(), is_adult: $("user-resource-adult").checked }) });
        }
        if (!response.ok) throw await responseError(response);
        closeUserResourceDialog(); await loadUserResources(); showNotice("push-notice", state.userResourceEditing ? "资源已更新。" : "资源已加入列表。", "ok");
      } catch (error) { showNotice("user-resource-notice", error.message, "error"); }
      finally { button.disabled = false; }
    }

    async function toggleUserResource(item) {
      const response = await fetch("/api/v1/user/tvbox/resources/" + encodeURIComponent(item.id) + "/enabled", { method: "PUT", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: !item.enabled }) });
      if (!response.ok) return showNotice("push-notice", (await responseError(response)).message, "error");
      await loadUserResources();
    }

    async function moveUserResource(item, delta) {
      const index = state.resources.findIndex((value) => value.id === item.id); const other = state.resources[index + delta]; if (!other) return;
      await Promise.all([
        fetch("/api/v1/user/tvbox/resources/" + encodeURIComponent(item.id) + "/order", { method: "PUT", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ sort_order: other.sort_order }) }),
        fetch("/api/v1/user/tvbox/resources/" + encodeURIComponent(other.id) + "/order", { method: "PUT", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ sort_order: item.sort_order }) })
      ]);
      await loadUserResources();
    }

    async function deleteUserResource(item) {
      if (!confirm("确定删除资源 " + item.name + "？")) return;
      const response = await fetch("/api/v1/user/tvbox/resources/" + encodeURIComponent(item.id), { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) return showNotice("push-notice", (await responseError(response)).message, "error");
      await loadUserResources(); showNotice("push-notice", "资源已删除。", "ok");
    }

    function replaceUserResource(item) {
      const input = document.createElement("input"); input.type = "file"; input.accept = ".py,text/x-python";
      input.addEventListener("change", async () => { const file = input.files[0]; if (!file) return; const form = new FormData(); form.append("file", file); const response = await fetch("/api/v1/user/tvbox/resources/" + encodeURIComponent(item.id), { method: "PUT", credentials: "same-origin", body: form }); if (!response.ok) return showNotice("push-notice", (await responseError(response)).message, "error"); await loadUserResources(); showNotice("push-notice", "Python 文件已替换。", "ok"); });
      input.click();
    }

    async function openUserResourceViewer(item) {
      $("user-resource-view-title").textContent = item.name;
      $("user-resource-view-meta").textContent = item.source_type === "upload" ? "本地文件 · 只读查看" : "远程地址 · 只读查看";
      $("user-resource-view-content").textContent = "加载中…"; showNotice("user-resource-view-notice", "", ""); $("user-resource-view-dialog").showModal();
      const response = await fetch("/api/v1/user/tvbox/resources/" + encodeURIComponent(item.id) + "/content", { credentials: "same-origin" });
      if (!response.ok) return showNotice("user-resource-view-notice", (await responseError(response)).message, "error");
      const result = await response.json();
      const content = $("user-resource-view-content");
      content.classList.toggle("python-source", result.resource_type === "py");
      if (result.resource_type === "py" && result.content) {
        content.innerHTML = highlightPython(result.content);
      } else {
        content.textContent = result.content ?? result.source_url ?? "—";
      }
    }

    function closeUserResourceViewer() { if ($("user-resource-view-dialog").open) $("user-resource-view-dialog").close(); }
    async function copyUserResourceContent() { try { await navigator.clipboard.writeText($("user-resource-view-content").textContent); showNotice("user-resource-view-notice", "内容已复制。", "ok"); } catch { showNotice("user-resource-view-notice", "复制失败，请手动选择内容。", "error"); } }

    function highlightPython(source) {
      const keywords = new Set(["and","as","assert","async","await","break","case","class","continue","def","del","elif","else","except","finally","for","from","global","if","import","in","is","lambda","match","nonlocal","not","or","pass","raise","return","try","while","with","yield"]);
      const constants = new Set(["True","False","None","NotImplemented","Ellipsis"]);
      const tokenPattern = /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|#[^\r\n]*|\b[A-Za-z_]\w*\b|\b\d+(?:\.\d+)?\b)/g;
      let result = ""; let lastIndex = 0; let match;
      while ((match = tokenPattern.exec(source)) !== null) {
        result += escapeHTML(source.slice(lastIndex, match.index));
        const token = match[0];
        const className = token.startsWith("#")
          ? "python-comment"
          : token.startsWith("\"") || token.startsWith("'")
            ? "python-string"
            : constants.has(token)
              ? "python-constant"
              : keywords.has(token)
                ? "python-keyword"
                : /^\d/.test(token)
                  ? "python-number"
                  : "";
        result += className ? "<span class=\"" + className + "\">" + escapeHTML(token) + "</span>" : escapeHTML(token);
        lastIndex = tokenPattern.lastIndex;
      }
      return result + escapeHTML(source.slice(lastIndex));
    }

    async function saveUserTVBoxSettingsForm(event) {
      event.preventDefault();
      try {
        const template = JSON.parse($("user-tvbox-template").value);
        const response = await fetch("/api/v1/user/tvbox/settings", { method: "PUT", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ template, linked_plugin_id: $("user-tvbox-plugin-id").value.trim() || null }) });
        if (!response.ok) throw await responseError(response); await loadUserTVBoxSettings(); showNotice("user-tvbox-settings-notice", "设置已保存。", "ok");
      } catch (error) { showNotice("user-tvbox-settings-notice", error instanceof SyntaxError ? "模板不是有效 JSON。" : error.message, "error"); }
    }

    async function generateUserTVBox(sync) {
      const button = sync ? $("user-tvbox-sync") : $("user-tvbox-generate"); button.disabled = true; showNotice("user-tvbox-settings-notice", sync ? "正在生成并同步…" : "正在生成配置…", "");
      try {
        const response = await fetch("/api/v1/user/tvbox/" + (sync ? "sync" : "generate"), { method: "POST", credentials: "same-origin" });
        if (!response.ok) throw await responseError(response); const result = await response.json(); await loadUserTVBoxSettings(); $("user-tvbox-config-url").value = result.config_url; showNotice("user-tvbox-settings-notice", result.plugin_sync_error ? result.plugin_sync_error : (sync ? "配置已生成，插件同步完成。" : "配置已生成。"), result.plugin_sync_error ? "error" : "ok");
      } catch (error) { showNotice("user-tvbox-settings-notice", error.message, "error"); }
      finally { button.disabled = false; }
    }

    function formatBytes(value) { if (value < 1024) return value + " B"; if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB"; return (value / (1024 * 1024)).toFixed(1) + " MB"; }
    function escapeHTML(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }

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
        renderSubmissions();
      } catch (error) {
        showNotice("editor-notice", error.message, "error");
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
        const iconURL = typeof item.manifest.icon === "string" ? item.manifest.icon.trim() : "";
        const fallbackIcon = () => {
          const fallback = document.createElement("span");
          fallback.className = "plugin-icon plugin-icon-fallback";
          fallback.textContent = "◇";
          fallback.title = "默认图标";
          fallback.setAttribute("aria-label", "默认图标");
          return fallback;
        };
        if (iconURL) {
          const icon = document.createElement("img");
          icon.className = "plugin-icon";
          icon.src = iconURL;
          icon.alt = item.manifest.name + " 图标";
          icon.loading = "lazy";
          icon.addEventListener("error", () => { icon.replaceWith(fallbackIcon()); }, { once: true });
          iconSlot.append(icon);
        } else iconSlot.append(fallbackIcon());
        identity.append(iconSlot);
        const identityText = document.createElement("div");
        const nameRow = document.createElement("div");
        nameRow.className = "plugin-name-row";
        const name = document.createElement("div");
        name.className = "plugin-name";
        name.textContent = item.manifest.name;
        nameRow.append(name);
        if (item.visibility === "private") {
          const lock = document.createElement("span");
          lock.className = "private-lock";
          lock.title = "私有插件";
          lock.setAttribute("aria-label", "私有插件");
          nameRow.append(lock);
        }
        const id = document.createElement("div");
        id.className = "plugin-id";
        id.textContent = item.plugin_id;
        identityText.append(nameRow, id);
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
      closeResourceMenu();
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

    function closeResourceMenu() {
      if (state.resourceActionTrigger) state.resourceActionTrigger.setAttribute("aria-expanded", "false");
      state.resourceActionTrigger = null;
      $("resource-action-menu").hidden = true;
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
      state.selectedPluginType = null;
      renderPluginTypeChoices();
      showNotice("plugin-type-notice", "", "");
      $("confirm-plugin-type").disabled = true;
      $("plugin-type-dialog").showModal();
    }

    function renderPluginTypeChoices() {
      const container = $("plugin-type-options");
      container.replaceChildren();
      for (const type of state.pluginTypes) {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "plugin-type-option";
        option.dataset.type = type.value;
        const title = document.createElement("strong");
        title.textContent = type.name + "（" + type.value + "）";
        const hint = document.createElement("span");
        hint.textContent = type.description || "选择此类型创建插件";
        option.append(title, hint);
        option.addEventListener("click", () => {
          state.selectedPluginType = type.value;
          container.querySelectorAll(".plugin-type-option").forEach((item) => item.classList.toggle("selected", item === option));
          $("confirm-plugin-type").disabled = false;
        });
        container.append(option);
      }
      if (!state.pluginTypes.length) {
        showNotice("plugin-type-notice", "暂无可用的插件类型。", "error");
      }
    }

    function closePluginTypeDialog() {
      if ($("plugin-type-dialog").open) $("plugin-type-dialog").close();
    }

    function confirmPluginType() {
      if (!state.selectedPluginType) return;
      closePluginTypeDialog();
      state.editing = false;
      populate({
        type: state.selectedPluginType, name: "Example Plugin",
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
      if (body.code === "database_not_initialized") {
        return new Error("数据库尚未初始化，请管理员先执行 D1 数据库迁移。");
      }
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
