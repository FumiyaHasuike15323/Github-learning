// 画面の切り替え(ホーム / ステージ / ステップ / 進捗の共有)
(function () {
  var $app = document.getElementById('app'), esc = VQ_ESC, C = VQ_CONTENT, S = function () { return VQ.state; };

  VQ.toast = function (msg) {
    var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(VQ.toast.t); VQ.toast.t = setTimeout(function () { t.classList.remove('on'); }, 2600);
  };

  function hud() {
    var lv = VQ.level(), total = VQ.allSteps().reduce(function (a, x) { return a + VQ.xpOf(x.step); }, 0);
    document.getElementById('hud').innerHTML = '<span class="pill">Lv.' + lv.n + ' ' + lv.title + '</span><span class="pill">⭐ ' + VQ.totalXp() + ' / ' + total + ' XP</span><a class="pill" href="#/share">📤 進捗</a>';
  }

  // ---------- ホーム ----------
  function home() {
    var all = VQ.allSteps(), doneN = all.filter(function (x) { return S().done[x.step.id]; }).length, clear = doneN === all.length;
    var next = all.filter(function (x) { return !S().done[x.step.id] && VQ.unlocked(x.si); })[0];
    var h = '<h1>' + C.title + '</h1><p class="lead">' + C.lead + '</p>';
    if (clear) h += '<div class="note ok"><b>🎉 全ステージクリア！</b> あなたはAIと一緒に、Webサービスを作って公開し、育てられるようになりました。<br><a href="#/share">進捗を先生に送る →</a></div>';
    else if (next) h += '<div class="card"><b>' + (doneN ? '続きから' : 'はじめる') + '</b>: ' + next.stage.emoji + ' ' + next.stage.title + ' › ' + next.step.title +
      '<div class="row"><span class="lead" style="margin:0">全体 ' + doneN + ' / ' + all.length + ' ステップ</span><a class="btn" style="text-decoration:none" href="#/s/' + (next.si + 1) + '/' + (next.i + 1) + '">' + (doneN ? '続きをやる' : 'スタート！') + '</a></div><div class="bar"><i style="width:' + Math.round(doneN / all.length * 100) + '%"></i></div></div>';
    h += '<h2>ステージマップ</h2><div class="stage-grid">';
    C.stages.forEach(function (st, si) {
      var p = VQ.stageProgress(st), open = VQ.unlocked(si);
      h += '<a class="stage' + (open ? '' : ' locked') + '" href="' + (open ? '#/s/' + (si + 1) : '#/') + '"' + (open ? '' : ' data-locked="1"') + '><span class="emoji">' + (open ? st.emoji : '🔒') + '</span><span class="meta"><div class="t">ステージ' + (si + 1) + ' ' + st.title + (p.clear ? ' <span class="badge">クリア</span>' : '') + '</div><div class="d">' + st.summary + '</div><div class="bar' + (p.clear ? ' ok' : '') + '"><i style="width:' + Math.round(p.done / p.total * 100) + '%"></i></div></span><span class="d">' + p.done + '/' + p.total + '</span></a>';
    });
    h += '</div>' + '<div class="note" style="margin-top:18px"><b>🔐 約束:</b> このゲームはAPIキーやパスワードを入力させません。ミッションで扱う秘密の情報は、あなたの手元だけで管理します。</div>';
    $app.innerHTML = h;
    $app.querySelectorAll('[data-locked]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); VQ.toast('🔒 前のステージをクリアすると開きます'); }; });
  }

  // ---------- ステージ(ステップ一覧) ----------
  function stagePage(si) {
    var st = C.stages[si]; if (!st) return home();
    if (!VQ.unlocked(si)) { location.hash = '#/'; return; }
    var h = '<div class="crumb"><a href="#/">← マップ</a></div><h1>' + st.emoji + ' ステージ' + (si + 1) + ' ' + st.title + '</h1><p class="lead">' + st.intro + '</p><div class="stage-grid">';
    st.steps.forEach(function (s, i) {
      var d = S().done[s.id];
      h += '<a class="stage" href="#/s/' + (si + 1) + '/' + (i + 1) + '"><span class="emoji">' + (d ? '✅' : s.type === 'mission' ? '🎯' : '🎮') + '</span><span class="meta"><div class="t">' + s.title + '</div><div class="d">' + s.kind + ' ・ ' + VQ.xpOf(s) + 'XP' + (d === 's' ? ' ・自己申告' : '') + '</div></span></a>';
    });
    $app.innerHTML = h + '</div>';
  }

  // ---------- ステップ ----------
  function stepPage(si, i) {
    var st = C.stages[si], step = st && st.steps[i]; if (!step) return home();
    if (!VQ.unlocked(si)) { location.hash = '#/'; return; }
    $app.innerHTML = '<div class="crumb"><a href="#/">マップ</a> › <a href="#/s/' + (si + 1) + '">' + st.emoji + ' ' + st.title + '</a></div><h1>' + step.title + '</h1><div class="dots" id="dots"></div><div id="game"></div><div class="row" id="nav"></div>';
    function chrome() {
      document.getElementById('dots').innerHTML = st.steps.map(function (s, k) { return '<i class="' + (S().done[s.id] ? 'done' : '') + (k === i ? ' cur' : '') + '"></i>'; }).join('');
      var last = i === st.steps.length - 1, ok = !!S().done[step.id];
      document.getElementById('nav').innerHTML = '<a class="btn ghost" style="text-decoration:none" href="' + (i ? '#/s/' + (si + 1) + '/' + i : '#/s/' + (si + 1)) + '">← 前へ</a>' +
        '<a class="btn" style="text-decoration:none' + (ok ? '' : ';opacity:.4;pointer-events:none') + '" href="' + (last ? '#/s/' + (si + 1) : '#/s/' + (si + 1) + '/' + (i + 2)) + '">' + (last ? 'ステージ一覧へ' : '次へ →') + '</a>';
      hud();
    }
    chrome();
    VQ_GAMES[step.type](document.getElementById('game'), step, function (how) {
      var wasClear = VQ.stageProgress(st).clear, first = VQ.complete(step.id, how);
      if (first) VQ.toast('⭐ +' + VQ.xpOf(step) + ' XP！'); 
      if (!wasClear && VQ.stageProgress(st).clear) setTimeout(function () { VQ.toast('🏆 ステージクリア！ おめでとう！'); }, 900);
      chrome();
      document.getElementById('nav').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // ---------- 進捗の共有 ----------
  function issueUrl() {
    var r = VQ.report(), s = S(), cfg = window.VQ_CONFIG;
    var payload = { v: 1, n: s.name, xp: r.xp, d: s.done, t: new Date().toISOString() };
    var body = '## 進捗レポート\n\n- ニックネーム: ' + s.name + '\n- レベル: Lv.' + r.lv.n + ' ' + r.lv.title + ' / ' + r.xp + ' XP\n\n' + r.stages.map(function (l) { return '- ' + l; }).join('\n') +
      '\n\n> このIssueは学習の進捗共有用です。APIキー・パスワードなどの秘密情報は絶対に書かないでください。\n\n<!-- VQ-PROGRESS ' + JSON.stringify(payload) + ' -->';
    return 'https://github.com/' + cfg.owner + '/' + cfg.repo + '/issues/new?title=' + encodeURIComponent('[進捗] ' + (s.name || s.gh || '名無し') + ' Lv.' + r.lv.n) + '&body=' + encodeURIComponent(body);
  }
  function share() {
    var s = S(), r = VQ.report(), cfg = window.VQ_CONFIG;
    $app.innerHTML = '<div class="crumb"><a href="#/">← マップ</a></div><h1>📤 進捗の共有</h1><p class="lead">ここまでの進捗を先生(このリポジトリの管理者)に送れます。サーバー不要・無料で、GitHubのIssueとして届きます。</p>' +
      '<div class="card"><label class="f">ニックネーム(必須・Issueは公開されるので本名は避けてOK)</label><input type="text" id="nm" value="' + esc(s.name) + '" maxlength="30" placeholder="例: たろう">' +
      '<label class="f">GitHubユーザー名(任意)</label><input type="text" id="gh" value="' + esc(s.gh) + '" maxlength="39"></div>' +
      '<div class="card"><h3>いまの状況: Lv.' + r.lv.n + ' ' + r.lv.title + ' / ' + r.xp + ' XP</h3>' + r.stages.map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('') + '</div>' +
      '<div class="card"><h3>1. 先生に送る</h3><p>ボタンを押すとGitHubの画面が開きます。<b>「Submit new issue」</b>を押せば送信完了です(GitHubにログインしている必要があります)。<br>送り先: <span class="mono">' + esc(cfg.owner + '/' + cfg.repo) + '</span></p><div class="note">送られる内容: ニックネーム・XP・どのステップが終わったか だけ。キーやパスワードは含まれません。</div><button class="btn" id="send">進捗を送る</button></div>' +
      '<div class="card"><h3>2. 引っ越し用コード(別のPC・スマホで続けるとき)</h3><p class="lead">進捗はこのブラウザに保存されています。別の端末で続けたいときはコードをコピーして、そちらで貼り付けてください。</p><textarea id="code" rows="3" placeholder="ここにコードを貼り付けて「読み込む」"></textarea><div class="row"><button class="btn ghost" id="exp">いまの進捗のコードを表示</button><button class="btn" id="imp">読み込む</button></div></div>' +
      '<div class="card"><h3>3. その他</h3><label><input type="checkbox" id="ua"' + (s.unlockAll ? ' checked' : '') + '> 全ステージを開放する(経験者・先生向け)</label><div class="row"><span></span><button class="btn ghost" id="rst">進捗をリセット</button></div></div>';
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
    window.scrollTo(0, 0);
    if (p[0] === 's' && p[1] && p[2]) stepPage(+p[1] - 1, +p[2] - 1);
    else if (p[0] === 's' && p[1]) stagePage(+p[1] - 1);
    else if (p[0] === 'share') share();
    else home();
    hud();
  }
  window.addEventListener('hashchange', route);
  route();
})();
