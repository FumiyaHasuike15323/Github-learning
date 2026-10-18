// 画面の切り替え(ホーム / ステージ / ステップ / ヘルプ / 進捗の共有)
(function () {
  var $app = document.getElementById('app'), $bar = document.getElementById('stepbar'), esc = VQ_ESC, C = VQ_CONTENT;
  var S = function () { return VQ.state; };
  var ICON = { cards: '📖', quiz: '❓', order: '🔢', match: '🔗', sort: '🗂', spot: '🔍', choose: '🧭', setup: '🪪', mission: '🎯' };
  var KIND = { cards: 'よみもの', quiz: 'クイズ', order: 'ならべかえ', match: 'マッチ', sort: '仕分け', spot: '間違い探し', choose: '選択', setup: '設定', mission: 'ミッション' };

  VQ.toast = function (msg) {
    var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(VQ.toast.t); VQ.toast.t = setTimeout(function () { t.classList.remove('on'); }, 2600);
  };

  // ---------- 紙吹雪 ----------
  function confetti() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var c = document.getElementById('confetti'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
    var cols = ['#6d5efc', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'], ps = [];
    for (var i = 0; i < 140; i++) ps.push({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * .5, r: 4 + Math.random() * 5, vx: -1.5 + Math.random() * 3, vy: 2 + Math.random() * 4, c: cols[i % cols.length], a: Math.random() * 6 });
    var t0 = Date.now();
    (function frame() {
      x.clearRect(0, 0, c.width, c.height);
      ps.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.a += .1; x.fillStyle = p.c; x.fillRect(p.x, p.y, p.r, p.r * (1 + Math.sin(p.a) * .6)); });
      if (Date.now() - t0 < 2800) requestAnimationFrame(frame); else x.clearRect(0, 0, c.width, c.height);
    })();
  }

  // ---------- ステージクリアの演出 ----------
  function showClear(si) {
    var st = C.stages[si], nextOpen = C.stages[si + 1], last = !nextOpen;
    var m = document.createElement('div'); m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = '<div class="box"><div class="big-badge">' + st.badge.emoji + '</div><h2 style="margin:.3em 0">ステージクリア！</h2><p><b>「' + st.badge.name + '」</b>バッジを手に入れた！</p>' +
      '<p class="lead">' + (last ? '全ステージ制覇！あなたはもうバイブコーダーです。' : '次は「' + nextOpen.title + '」。') + '</p>' +
      '<div class="row" style="justify-content:center"><button class="btn ghost" id="m-map">マップへ</button>' + (last ? '<button class="btn" id="m-go">修了証を見る</button>' : '<button class="btn" id="m-go">次のステージへ →</button>') + '</div></div>';
    document.body.appendChild(m); confetti();
    function close(to) { document.body.removeChild(m); document.removeEventListener('keydown', key); if (to) location.hash = to; }
    function key(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', key);
    m.querySelector('#m-map').onclick = function () { close('#/'); };
    m.querySelector('#m-go').onclick = function () { close(last ? '#/share' : '#/s/' + (si + 2)); };
    m.querySelector('#m-go').focus();
  }

  function hud() {
    var lv = VQ.level();
    document.getElementById('hud').innerHTML = '<span class="pill" title="レベル">Lv.' + lv.n + ' ' + lv.title + '</span><span class="pill" title="経験値">⭐ ' + VQ.totalXp() + ' / ' + VQ.maxXp() + '</span><a class="pill" href="#/help">❓ ヘルプ</a><a class="pill" href="#/share">📤 進捗</a>';
  }
  function nextTodo() { return VQ.allSteps().filter(function (x) { return !S().done[x.step.id] && VQ.unlocked(x.si); })[0]; }

  // ---------- ホーム ----------
  function home() {
    var all = VQ.allSteps(), doneN = all.filter(function (x) { return S().done[x.step.id]; }).length, clear = doneN === all.length, next = nextTodo();
    var left = all.filter(function (x) { return !S().done[x.step.id]; }).reduce(function (a, x) { return a + VQ.minOf(x.step); }, 0);
    var h = '<section class="hero"><div class="big-emoji">🧭</div><h1>' + C.title + '</h1><p>' + C.lead + '</p>';
    if (clear) h += '<a class="btn" href="#/share">🎓 修了証を見る</a>';
    else if (next) h += '<a class="btn" href="#/s/' + (next.si + 1) + '/' + (next.i + 1) + '">' + (doneN ? '▶ 続きから: ' + next.step.title : '▶ 冒険をはじめる') + '</a>';
    h += '</section>';
    h += '<div class="card"><div class="row" style="margin:0"><b>' + (doneN ? 'ここまでの進み具合' : '全体のボリューム') + '</b><span class="count">' + doneN + ' / ' + all.length + ' ステップ' + (clear ? '' : ' ・ 残り約' + Math.ceil(left / 10) * 10 + '分') + '</span></div><div class="bar' + (clear ? ' ok' : '') + '"><i style="width:' + Math.round(doneN / all.length * 100) + '%"></i></div>' +
      (doneN === 0 ? '<p class="lead" style="margin:10px 0 0">ぜんぶで約' + Math.round(left / 60 * 10) / 10 + '時間。<b>1回15〜30分ずつ</b>、途中で止めてもOK。進捗はこのブラウザに自動で保存されます。</p>' : '') + '</div>';
    h += '<h2>冒険マップ</h2><ol class="road">';
    var curSi = next ? next.si : -1;
    C.stages.forEach(function (st, si) {
      var p = VQ.stageProgress(st), open = VQ.unlocked(si), cls = p.clear ? 'done' : !open ? 'lock' : si === curSi ? 'cur' : '';
      h += '<li class="' + cls + '"><span class="node" aria-hidden="true">' + (p.clear ? '✅' : open ? st.emoji : '🔒') + '</span><a class="stage' + (open ? '' : ' locked') + '" href="' + (open ? '#/s/' + (si + 1) : '#/') + '"' + (open ? '' : ' data-locked="1"') + '>' +
        '<div class="t">ステージ' + si + ' ' + st.title + (p.clear ? ' <span class="badge">クリア</span>' : '') + '</div><div class="d">' + st.summary + '</div>' +
        '<div class="m"><span>⏱ 約' + VQ.stageMinutes(st) + '分</span><span>📚 ' + p.done + '/' + p.total + ' ステップ</span></div><div class="bar' + (p.clear ? ' ok' : '') + '"><i style="width:' + Math.round(p.done / p.total * 100) + '%"></i></div></a></li>';
    });
    h += '</ol><h2>バッジ</h2><div class="shelf">' + C.stages.map(function (st) { var on = VQ.stageProgress(st).clear; return '<div class="medal' + (on ? '' : ' off') + '"><i>' + st.badge.emoji + '</i>' + st.badge.name + '</div>'; }).join('') + '</div>';
    h += '<h2>困ったときは</h2><div class="quick"><a href="#/help">❓ ヘルプ<span>用語集・つまずき解決・AIへの伝え方テンプレ</span></a><a href="#/share">📤 進捗を先生に送る<span>別の端末で続ける「引っ越しコード」も</span></a></div>';
    h += '<div class="note ok" style="margin-top:18px"><b>🔐 約束:</b> このゲームはAPIキーやパスワードを入力させません。ミッションで扱う秘密の情報は、あなたの手元だけで管理します。</div>';
    $app.innerHTML = h;
    $app.querySelectorAll('[data-locked]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); VQ.toast('🔒 前のステージをクリアすると開きます'); }; });
  }

  // ---------- ステージ(ステップ一覧) ----------
  function stagePage(si) {
    var st = C.stages[si]; if (!st) return home();
    if (!VQ.unlocked(si)) { location.hash = '#/'; return; }
    var p = VQ.stageProgress(st);
    var h = '<div class="crumb"><a href="#/">← 冒険マップ</a></div><h1>' + st.emoji + ' ステージ' + si + ' ' + st.title + '</h1><p class="lead">' + st.intro + '</p>' +
      '<div class="card"><b>このステージで できるようになること</b><ul class="can">' + st.can.map(function (c) { return '<li>' + c + '</li>'; }).join('') + '</ul><div class="m lead" style="margin:6px 0 0">⏱ 約' + VQ.stageMinutes(st) + '分 ・ 📚 ' + p.done + '/' + p.total + ' ステップ</div><div class="bar' + (p.clear ? ' ok' : '') + '"><i style="width:' + Math.round(p.done / p.total * 100) + '%"></i></div></div><ol class="steps">';
    st.steps.forEach(function (s, i) {
      var d = S().done[s.id];
      h += '<li><a class="' + (d ? 'done' : '') + '" href="#/s/' + (si + 1) + '/' + (i + 1) + '"><span class="ico">' + (d ? '✅' : ICON[s.type]) + '</span><span><div class="t">' + s.title + '</div><div class="d">' + KIND[s.type] + ' ・ 約' + VQ.minOf(s) + '分 ・ ' + VQ.xpOf(s) + 'XP' + (d === 's' ? ' ・自己申告' : d === 'v' ? ' ・自動確認' : '') + '</div></span></a></li>';
    });
    $app.innerHTML = h + '</ol>';
  }

  // ---------- ステップ ----------
  function stepPage(si, i) {
    var st = C.stages[si], step = st && st.steps[i]; if (!step) return home();
    if (!VQ.unlocked(si)) { location.hash = '#/'; return; }
    $app.innerHTML = '<div class="crumb"><a href="#/">マップ</a> › <a href="#/s/' + (si + 1) + '">' + st.emoji + ' ' + st.title + '</a></div><h1>' + step.title + '</h1><div class="dots" id="dots" aria-hidden="true"></div><div id="game"></div>';
    function chrome() {
      document.getElementById('dots').innerHTML = st.steps.map(function (s, k) { return '<i class="' + (S().done[s.id] ? 'done' : '') + (k === i ? ' cur' : '') + '"></i>'; }).join('');
      var last = i === st.steps.length - 1, ok = !!S().done[step.id];
      $bar.hidden = false;
      $bar.innerHTML = '<div class="in"><button class="btn ghost" id="bp">← 前へ</button><div class="mid">' + st.emoji + ' ステージ' + si + '<br>ステップ ' + (i + 1) + ' / ' + st.steps.length + '</div><button class="btn" id="bn"' + (ok ? '' : ' disabled') + '>' + (last ? 'ステージ一覧へ' : '次へ →') + '</button></div>';
      $bar.querySelector('#bp').onclick = function () { location.hash = i ? '#/s/' + (si + 1) + '/' + i : '#/s/' + (si + 1); };
      $bar.querySelector('#bn').onclick = function () { location.hash = last ? '#/s/' + (si + 1) : '#/s/' + (si + 1) + '/' + (i + 2); };
      hud();
    }
    chrome();
    VQ_GAMES[step.type](document.getElementById('game'), step, function (how) {
      var wasClear = VQ.stageProgress(st).clear, first = VQ.complete(step.id, how);
      if (first) VQ.toast('⭐ +' + VQ.xpOf(step) + ' XP！');
      chrome();
      if (!wasClear && VQ.stageProgress(st).clear) setTimeout(function () { showClear(si); }, 500);
      else if (first) $bar.querySelector('#bn').focus({ preventScroll: true });
    });
  }

  // ---------- ヘルプ ----------
  function help() {
    var H = VQ_HELP;
    $app.innerHTML = '<div class="crumb"><a href="#/">← 冒険マップ</a></div><h1>❓ ヘルプ</h1><p class="lead">つまずいたらここ。キーワードで探せます。</p>' +
      '<input type="text" id="q" class="search" placeholder="🔍 言葉で探す(例: エラー, キー, push, 404)" aria-label="ヘルプ内検索"><div id="res"></div>';
    function draw(q) {
      q = (q || '').trim().toLowerCase();
      var hit = function (s) { return !q || s.toLowerCase().indexOf(q) >= 0; };
      var faq = H.faq.filter(function (f) { return hit(f.q + f.a); }), gl = H.glossary.filter(function (g) { return hit(g.t + g.d); }), tp = H.templates.filter(function (t) { return hit(t.label + t.text + (t.when || '')); });
      var h = '';
      if (faq.length) h += '<h2>🩺 困った時の対処</h2><div class="faq">' + faq.map(function (f) { return '<details' + (q ? ' open' : '') + '><summary>' + f.q + '</summary><div class="body">' + f.a + '</div></details>'; }).join('') + '</div>';
      if (tp.length) h += '<h2>📋 AIへの伝え方テンプレ</h2><p class="lead">コピーして、〈 〉の部分を自分の内容に変えて使います。</p>' + tp.map(function (t, k) { return '<div class="tpl"><b>' + t.label + '</b><div class="lead" style="margin:0">' + (t.when || '') + '</div><div class="prompt"><div class="phead"><span class="lbl">テンプレ</span><button class="btn sm" data-t="' + k + '">コピー</button></div><div class="ptext">' + esc(t.text) + '</div></div></div>'; }).join('');
      if (gl.length) h += '<h2>📚 用語集</h2><dl class="gl">' + gl.map(function (g) { return '<dt>' + g.t + '</dt><dd>' + g.d + '</dd>'; }).join('') + '</dl>';
      if (!h) h = '<div class="note">見つかりませんでした。別の言葉で探すか、AIに「〇〇って何？初心者向けに教えて」と聞いてみよう。</div>';
      var res = document.getElementById('res'); res.innerHTML = h;
      res.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { VQ.copy(tp[+b.dataset.t].text, b); }; });
    }
    draw(''); document.getElementById('q').oninput = function (e) { draw(e.target.value); };
  }

  // ---------- 進捗の共有・修了証 ----------
  function issueUrl() {
    var r = VQ.report(), s = S(), cfg = window.VQ_CONFIG;
    var payload = { v: 1, n: s.name, xp: r.xp, tl: s.tool, pv: s.provider, d: s.done, t: new Date().toISOString() };
    var body = '## 進捗レポート\n\n- ニックネーム: ' + s.name + '\n- レベル: Lv.' + r.lv.n + ' ' + r.lv.title + ' / ' + r.xp + ' XP\n- AIの使い方: ' + (s.tool === 'chat' ? 'チャットAI' : s.tool === 'agent' ? 'Git連携AI' : '未選択') + '\n\n' + r.stages.map(function (l) { return '- ' + l; }).join('\n') +
      '\n\n> このIssueは学習の進捗共有用です。APIキー・パスワードなどの秘密情報は絶対に書かないでください。\n\n<!-- VQ-PROGRESS ' + JSON.stringify(payload) + ' -->';
    return 'https://github.com/' + cfg.owner + '/' + cfg.repo + '/issues/new?title=' + encodeURIComponent('[進捗] ' + (s.name || s.gh || '名無し') + ' Lv.' + r.lv.n) + '&body=' + encodeURIComponent(body);
  }
  function share() {
    var s = S(), r = VQ.report(), cfg = window.VQ_CONFIG, all = VQ.allSteps().every(function (x) { return s.done[x.step.id]; });
    var h = '<div class="crumb"><a href="#/">← 冒険マップ</a></div><h1>📤 進捗の共有</h1><p class="lead">ここまでの進捗を先生(このリポジトリの管理者)に送れます。サーバー不要・無料で、GitHubのIssueとして届きます。</p>';
    if (all) h += '<div class="cert"><div style="font-size:56px">🎓</div><h2>修了証</h2><p>バイブコーダー・クエストの全ステージを修了しました</p><div class="who">' + esc(s.name || 'あなた') + '</div><p class="count">' + new Date().toLocaleDateString('ja-JP') + '</p><button class="btn noprint" onclick="print()">印刷 / PDFで保存</button></div>';
    h += '<div class="card"><label class="f" for="nm">ニックネーム(送信に必須)</label><input type="text" id="nm" value="' + esc(s.name) + '" maxlength="30" placeholder="例: たろう">' +
      '<label class="f" for="gh">GitHubユーザー名(ミッションの自動確認で使います)</label><input type="text" id="gh" value="' + esc(s.gh) + '" maxlength="39" autocapitalize="off"></div>' +
      '<div class="card"><h2 class="ch">いまの状況: Lv.' + r.lv.n + ' ' + r.lv.title + ' / ' + r.xp + ' XP</h2>' + r.stages.map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('') + '</div>' +
      '<div class="card"><h2 class="ch">1. 先生に送る</h2><p>ボタンを押すとGitHubの画面が開きます。<b>「Submit new issue」</b>を押せば送信完了です(GitHubにログインしている必要があります)。<br>送り先: <span class="mono">' + esc(cfg.owner + '/' + cfg.repo) + '</span></p><div class="note ok">送られる内容: ニックネーム・XP・どのステップが終わったか だけ。キーやパスワードは含まれません。Issueは公開されます。</div><button class="btn" id="send">進捗を送る</button></div>' +
      '<div class="card"><h2 class="ch">2. 引っ越し用コード(別のPC・スマホで続けるとき)</h2><p class="lead">進捗はこのブラウザに保存されています。別の端末で続けたいときは、コードをコピーして、そちらで貼り付けてください。</p><textarea id="code" rows="3" placeholder="ここにコードを貼り付けて「読み込む」"></textarea><div class="row"><button class="btn ghost" id="exp">いまの進捗のコードを表示</button><button class="btn" id="imp">読み込む</button></div></div>' +
      '<div class="card"><h2 class="ch">3. その他</h2><label><input type="checkbox" id="ua"' + (s.unlockAll ? ' checked' : '') + '> 全ステージを開放する(経験者・先生向け)</label><div class="row"><span></span><button class="btn ghost" id="rst">進捗をリセット</button></div></div>';
    $app.innerHTML = h;
    var nm = $app.querySelector('#nm'), gh = $app.querySelector('#gh');
    nm.oninput = function () { s.name = nm.value.trim(); VQ.save(); };
    gh.oninput = function () { s.gh = gh.value.trim(); VQ.save(); };
    $app.querySelector('#send').onclick = function () {
      if (!s.name) { VQ.toast('ニックネームを入力してね'); nm.focus(); return; }
      window.open(issueUrl(), '_blank', 'noopener');
    };
    $app.querySelector('#exp').onclick = function () { var c = $app.querySelector('#code'); c.value = VQ.exportCode(); c.select(); };
    $app.querySelector('#imp').onclick = function () {
      try { VQ.importCode($app.querySelector('#code').value); VQ.toast('読み込みました！'); hud(); share(); } catch (e) { VQ.toast('コードが正しくないようです'); }
    };
    $app.querySelector('#ua').onchange = function (e) { s.unlockAll = e.target.checked; VQ.save(); };
    $app.querySelector('#rst').onclick = function () { if (confirm('本当に進捗をすべて消しますか?')) { VQ.reset(); hud(); share(); } };
  }

  function route() {
    var p = location.hash.replace(/^#\/?/, '').split('/');
    $bar.hidden = true;
    if (p[0] === 's' && p[1] && p[2]) stepPage(+p[1] - 1, +p[2] - 1);
    else if (p[0] === 's' && p[1]) stagePage(+p[1] - 1);
    else if (p[0] === 'share') share();
    else if (p[0] === 'help') help();
    else home();
    hud(); window.scrollTo(0, 0); $app.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', route);
  route();
})();
