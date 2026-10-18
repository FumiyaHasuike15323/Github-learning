// ステップの種類ごとの画面(よみもの / クイズ / 並べ替え / マッチ / 仕分け / 間違い探し / 選択 / 設定 / ミッション)
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function shuffle(a, notSame) {
    var b = a.slice();
    for (var t = 0; t < 10; t++) {
      for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = b[i]; b[i] = b[j]; b[j] = x; }
      if (!notSame || b.some(function (v, i) { return v !== a[i]; })) break;
    }
    return b;
  }
  function copy(text, btn) {
    function ok() { var o = btn.textContent; btn.textContent = 'コピーしました ✓'; btn.classList.add('copied'); setTimeout(function () { btn.textContent = o; btn.classList.remove('copied'); }, 1600); }
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { VQ.toast('コピーできませんでした。手で選択してコピーしてください'); } document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
  }
  function note(cls, html) { return '<div class="note ' + cls + '">' + html + '</div>'; }
  function next(label) { return '<div class="row end"><button class="btn" id="go">' + label + '</button></div>'; }

  var G = {};

  // ---- よみもの(カード) ----
  G.cards = function (el, step, done) {
    var i = 0, n = step.cards.length;
    function draw() {
      var c = step.cards[i];
      el.innerHTML = '<article class="card big" aria-live="polite"><h2 class="ch">' + VQ.fill(c.h) + '</h2><div class="body">' + VQ.fill(c.b) + '</div></article>' +
        '<div class="row"><button class="btn ghost" id="pv"' + (i === 0 ? ' disabled' : '') + '>← 前のカード</button><span class="count">' + (i + 1) + ' / ' + n + '</span>' +
        '<button class="btn" id="nx">' + (i === n - 1 ? '読み終えた！' : '次のカード →') + '</button></div>';
      el.querySelector('#pv').onclick = function () { i--; draw(); };
      el.querySelector('#nx').onclick = function () { if (i === n - 1) done('o'); else { i++; draw(); } };
    }
    draw();
  };

  // ---- クイズ(選択肢はシャッフル) ----
  G.quiz = function (el, step, done) {
    var qi = 0, qs = step.questions;
    function draw() {
      var q = qs[qi], tried = {}, order = shuffle(q.options.map(function (_, i) { return i; }));
      el.innerHTML = '<div class="card"><div class="crumb">問題 ' + (qi + 1) + ' / ' + qs.length + '</div><h2 class="ch">' + q.q + '</h2><div id="opts">' +
        order.map(function (i) { return '<button class="opt" data-i="' + i + '">' + q.options[i] + '</button>'; }).join('') + '</div><div id="fb" aria-live="polite"></div></div>';
      el.querySelectorAll('.opt').forEach(function (b) {
        b.onclick = function () {
          var i = +b.dataset.i, fb = el.querySelector('#fb');
          if (i === q.answer) {
            el.querySelectorAll('.opt').forEach(function (x) { x.disabled = true; });
            b.classList.add('right');
            fb.innerHTML = note('ok', '⭕ <b>正解！</b> ' + q.explain) + next(qi === qs.length - 1 ? 'クリア！' : '次の問題 →');
            fb.querySelector('#go').focus();
            fb.querySelector('#go').onclick = function () { if (qi === qs.length - 1) done('o'); else { qi++; draw(); } };
          } else if (!tried[i]) {
            tried[i] = 1; b.classList.add('wrong'); b.disabled = true;
            fb.innerHTML = note('ng', '❌ おしい！もう一度考えてみよう。' + (q.hint ? '<br>💡 ヒント: ' + q.hint : ''));
          }
        };
      });
    }
    draw();
  };

  // ---- 並べ替え ----
  G.order = function (el, step, done) {
    var pool = shuffle(step.items, true), ans = [];
    function draw(msg, ok) {
      el.innerHTML = '<div class="card"><h2 class="ch">' + step.prompt + '</h2><p class="lead">下の項目をタップして、正しい順に上の枠へ入れよう。入れたものをタップすると戻せます。</p>' +
        '<div class="slot" id="ans">' + (ans.length ? ans.map(function (t, i) { return '<button class="chip" data-a="' + i + '"><span class="num">' + (i + 1) + '</span>' + t + '</button>'; }).join('') : '<span class="lead">ここに並べる</span>') + '</div>' +
        '<div id="pool">' + pool.map(function (t, i) { return '<button class="chip" data-p="' + i + '">' + t + '</button>'; }).join('') + '</div>' +
        '<div id="fb" aria-live="polite">' + (msg || '') + '</div>' +
        (ok ? next('クリア！') : '<div class="row"><button class="btn ghost" id="rs">やり直す</button><button class="btn" id="ck"' + (pool.length ? ' disabled' : '') + '>答え合わせ</button></div>') + '</div>';
      el.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { ans.push(pool.splice(+b.dataset.p, 1)[0]); draw(); }; });
      el.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { pool.push(ans.splice(+b.dataset.a, 1)[0]); draw(); }; });
      if (ok) { el.querySelector('#go').onclick = function () { done('o'); }; return; }
      el.querySelector('#rs').onclick = function () { pool = shuffle(step.items, true); ans = []; draw(); };
      el.querySelector('#ck').onclick = function () {
        var wrong = ans.filter(function (t, i) { return t !== step.items[i]; }).length;
        if (!wrong) draw(note('ok', '⭕ <b>完璧！</b> ' + (step.explain || '')), true);
        else draw(note('ng', '❌ ' + wrong + ' か所ちがうよ。順番を見直してみよう。'));
      };
    }
    draw();
  };

  // ---- 用語マッチ ----
  G.match = function (el, step, done) {
    var rights = shuffle(step.pairs.map(function (p) { return p[1]; })), selL = null, hit = 0;
    el.innerHTML = '<div class="card"><h2 class="ch">' + step.prompt + '</h2><p class="lead">左の言葉をタップして、右の説明をタップ。</p><div class="cols"><div id="L">' +
      step.pairs.map(function (p, i) { return '<button class="opt" data-l="' + i + '">' + p[0] + '</button>'; }).join('') + '</div><div id="R">' +
      rights.map(function (t, i) { return '<button class="opt" data-r="' + i + '">' + t + '</button>'; }).join('') + '</div></div><div id="fb" aria-live="polite"></div></div>';
    var L = el.querySelectorAll('[data-l]'), R = el.querySelectorAll('[data-r]');
    L.forEach(function (b) { b.onclick = function () { L.forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); selL = +b.dataset.l; el.querySelector('#fb').innerHTML = ''; }; });
    R.forEach(function (b) {
      b.onclick = function () {
        if (selL == null) { el.querySelector('#fb').innerHTML = note('', '先に左の言葉を選んでね。'); return; }
        if (step.pairs[selL][1] === rights[+b.dataset.r]) {
          b.classList.add('matched'); L[selL].classList.remove('sel'); L[selL].classList.add('matched'); selL = null; hit++;
          if (hit === step.pairs.length) { el.querySelector('#fb').innerHTML = note('ok', '⭕ <b>全部そろった！</b>') + next('クリア！'); el.querySelector('#go').onclick = function () { done('o'); }; }
        } else { b.classList.add('shake'); setTimeout(function () { b.classList.remove('shake'); }, 350); }
      };
    });
  };

  // ---- 仕分け ----
  G.sort = function (el, step, done) {
    var items = shuffle(step.items), i = 0, miss = 0;
    function draw(msg) {
      if (i >= items.length) {
        el.innerHTML = '<div class="card"><h2 class="ch">🎉 仕分け完了！</h2><p>まちがい: ' + miss + ' 回' + (miss === 0 ? ' ― ノーミス！' : '') + '</p>' + next('クリア！') + '</div>';
        el.querySelector('#go').onclick = function () { done('o'); }; return;
      }
      el.innerHTML = '<div class="card"><div class="crumb">' + (i + 1) + ' / ' + items.length + '</div><h2 class="ch">' + step.prompt + '</h2>' +
        '<div class="flashcard">' + items[i].t + '</div>' +
        '<div class="cols">' + step.buckets.map(function (b) { return '<button class="opt center" data-b="' + b.id + '">' + b.label + '</button>'; }).join('') + '</div><div id="fb" aria-live="polite">' + (msg || '') + '</div></div>';
      el.querySelectorAll('[data-b]').forEach(function (b) {
        b.onclick = function () {
          if (b.dataset.b === items[i].bucket) { var w = items[i].why; i++; draw(note('ok', '⭕ ' + w)); }
          else { miss++; b.classList.add('wrong'); el.querySelector('#fb').innerHTML = note('ng', '❌ ちがうかも… ' + items[i].why); }
        };
      });
    }
    draw();
  };

  // ---- 間違い探し(危険な行をクリック) ----
  G.spot = function (el, step, done) {
    var sel = {};
    function draw(res, ok) {
      el.innerHTML = '<div class="card"><h2 class="ch">' + step.prompt + '</h2><p class="lead">危険だと思う行をタップして選択(もう一度タップで解除)。</p><pre class="code">' +
        step.lines.map(function (l, i) {
          var c = 'codeline'; if (sel[i]) c += ' sel';
          if (res) { if (l.bad && sel[i]) c += ' right'; else if (!l.bad && sel[i]) c += ' wrong'; else if (l.bad) c += ' miss'; }
          return '<span class="' + c + '" data-i="' + i + '" role="button" tabindex="0">' + esc(l.t) + '</span>';
        }).join('') + '</pre><div id="fb" aria-live="polite">' + (res || '') + '</div>' +
        (ok ? next('クリア！') : '<div class="row end"><button class="btn" id="ck">' + (res ? 'もう一度' : 'チェックする') + '</button></div>') + '</div>';
      if (ok) { el.querySelector('#go').onclick = function () { done('o'); }; return; }
      function toggle(s) { sel[s.dataset.i] = !sel[s.dataset.i]; s.classList.toggle('sel'); }
      if (!res) el.querySelectorAll('.codeline').forEach(function (s) { s.onclick = function () { toggle(s); }; s.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(s); } }; });
      el.querySelector('#ck').onclick = function () {
        if (res) { draw(); return; }
        var bad = step.lines.map(function (l, i) { return l.bad ? i : -1; }).filter(function (x) { return x >= 0; });
        var okAll = step.lines.every(function (l, i) { return !!l.bad === !!sel[i]; });
        var why = bad.map(function (i) { return '<li><code>' + esc(step.lines[i].t.trim()) + '</code> … ' + step.lines[i].why + '</li>'; }).join('');
        if (okAll) draw(note('ok', '⭕ <b>全部見つけた！</b><ul>' + why + '</ul>'), true);
        else { draw(note('ng', '❌ 見落とし(黄色の点線)か、選びすぎ(赤)があります。<br>💡 危険な行は ' + bad.length + ' か所です。')); sel = {}; }
      };
    }
    draw();
  };

  // ---- 選択(AIツール・APIサービスなど。あとで変更可) ----
  G.choose = function (el, step, done) {
    var S = VQ.state;
    function draw() {
      el.innerHTML = '<div class="card"><h2 class="ch">' + step.prompt + '</h2><p class="lead">' + (step.lead || '') + '</p>' +
        step.options.map(function (o) {
          return '<button class="opt big' + (S[step.key] === o.id ? ' sel' : '') + '" data-id="' + o.id + '"><b>' + o.label + '</b><span class="d">' + o.desc + '</span></button>';
        }).join('') + '<div class="note">あとからこのページに戻って、選び直せます。</div>' +
        (S[step.key] ? next('これで進む →') : '<div class="row end"><button class="btn" disabled>選んでください</button></div>') + '</div>';
      el.querySelectorAll('[data-id]').forEach(function (b) { b.onclick = function () { S[step.key] = b.dataset.id; VQ.save(); draw(); }; });
      var go = el.querySelector('#go'); if (go) go.onclick = function () { done('o'); };
    }
    draw();
  };

  // ---- 設定(ニックネーム) ----
  G.setup = function (el, step, done) {
    var S = VQ.state;
    el.innerHTML = '<div class="card"><h2 class="ch">' + step.prompt + '</h2><p class="lead">' + step.lead + '</p>' +
      '<label class="f" for="nick">ニックネーム</label><input type="text" id="nick" maxlength="30" value="' + esc(S.name) + '" placeholder="例: たろう"><p class="lead">本名でなくてOK。空のままでも進めます。</p>' + next('冒険に出発！') + '</div>';
    el.querySelector('#go').onclick = function () { S.name = el.querySelector('#nick').value.trim(); VQ.save(); done('o'); };
  };

  // ---- ミッション(実際に自分でやる) ----
  G.mission = function (el, step, done) {
    var S = VQ.state, v = step.verify, already = S.done[step.id];
    var chk = S.chk[step.id] || (S.chk[step.id] = []);
    var todo = step.todo.filter(function (t) { return VQ.matches(t.only); }).map(function (t) { return VQ.fill(t.t || t); });
    var prompts = (step.prompts || []).filter(function (p) { return VQ.matches(p.only); });

    function html() {
      var h = '<div class="card mission"><div class="mhead"><span class="tag">🎯 ミッション</span><span class="tag soft">⏱ 目安 約' + VQ.minOf(step) + '分</span>' +
        (S.tool && step.todo.some(function (t) { return t.only === 'chat' || t.only === 'agent'; }) ? '<span class="tag soft">' + (S.tool === 'agent' ? '🤖 Git連携AI' : '💬 チャットAI') + '</span>' : '') + '</div>' +
        '<h2 class="ch">' + step.goal + '</h2>';
      if (step.why) h += '<p class="lead">' + step.why + '</p>';
      h += '<div class="mprog"><div class="bar"><i id="mbar"></i></div><span id="mcount" class="count"></span></div>';
      h += '<ol class="todo">' + todo.map(function (t, i) { return '<li><input type="checkbox" id="c' + i + '"' + (chk[i] ? ' checked' : '') + '><label for="c' + i + '">' + t + '</label></li>'; }).join('') + '</ol>';
      prompts.forEach(function (p, i) { h += '<div class="prompt"><div class="phead"><span class="lbl">📋 ' + esc(p.label) + '</span><button class="btn sm" data-cp="' + i + '">コピー</button></div><div class="ptext">' + esc(VQ.fill(p.text)) + '</div></div>'; });
      if (step.warn) h += note('ng', VQ.fill(step.warn));
      (step.tips || []).filter(function (t) { return VQ.matches(t.only); }).forEach(function (t) { h += '<details><summary>' + t.h + '</summary><div class="body">' + VQ.fill(t.b) + '</div></details>'; });
      h += '<p class="stuck">😵 つまずいたら → <a href="#/help">ヘルプ(用語集・困った時の対処)</a></p></div>';
      if (v) {
        h += '<div class="card"><h2 class="ch">✅ 達成チェック</h2>';
        if (v.kind === 'user') h += '<label class="f" for="v-user">GitHubのユーザー名</label><input type="text" id="v-user" placeholder="例: taro-yamada" value="' + esc(S.gh) + '" autocapitalize="off" autocomplete="off">';
        else if (v.kind === 'url') h += '<label class="f" for="v-url">公開されたURL</label><input type="text" id="v-url" placeholder="https://..." value="' + esc(S.urls[v.urlKey || 'default'] || '') + '" autocapitalize="off">';
        else h += '<label class="f" for="v-user">GitHubのユーザー名</label><input type="text" id="v-user" value="' + esc(S.gh) + '" placeholder="例: taro-yamada" autocapitalize="off" autocomplete="off"><label class="f" for="v-repo">リポジトリ名</label><input type="text" id="v-repo" value="' + esc(S.repos[v.repoKey]) + '" autocapitalize="off">';
        h += '<div class="row"><span class="lead">GitHubの公開情報だけを見て自動で確認します</span><button class="btn" id="vgo">確認する</button></div><div id="vfb" aria-live="polite"></div>';
        h += '<details><summary>うまく確認できないとき(自己申告で進む)</summary><p>上の「やること」を全部チェックしたうえで、自己申告で完了にできます(先生には「自己申告」と表示されます)。</p><button class="btn ghost" id="self">自己申告で完了にする</button></details></div>';
      } else {
        h += '<div class="row end"><span class="lead">全部できたらチェックを入れて完了！</span><button class="btn" id="self">できた！</button></div>';
      }
      if (already) h += note('ok', '✔ このミッションは完了済みです(' + (already === 'v' ? '自動確認' : '自己申告') + ')。');
      return h;
    }
    el.innerHTML = html();
    function progress() {
      var n = todo.filter(function (t, i) { return chk[i]; }).length;
      el.querySelector('#mbar').style.width = Math.round(n / todo.length * 100) + '%';
      el.querySelector('#mcount').textContent = n + ' / ' + todo.length + ' できた';
      el.querySelectorAll('.todo li').forEach(function (li, i) { li.classList.toggle('on', !!chk[i]); });
    }
    progress();
    el.querySelectorAll('.todo input').forEach(function (c, i) { c.onchange = function () { chk[i] = c.checked; VQ.save(); progress(); }; });
    el.querySelectorAll('[data-cp]').forEach(function (b) { b.onclick = function () { copy(VQ.fill(prompts[+b.dataset.cp].text), b); }; });
    var self = el.querySelector('#self');
    if (self) self.onclick = function () {
      if (!todo.every(function (t, i) { return chk[i]; })) { VQ.toast('先に「やること」を全部チェックしてね'); return; }
      done('s');
    };
    var go = el.querySelector('#vgo');
    if (go) go.onclick = function () {
      var u = el.querySelector('#v-user'), r = el.querySelector('#v-repo'), w = el.querySelector('#v-url');
      if (u) S.gh = u.value.trim();
      go.disabled = true; go.textContent = '確認中…';
      VQ_VERIFY(v, { user: u && u.value, repo: r && r.value, url: w && w.value }).then(function (res) {
        go.disabled = false; go.textContent = '確認する'; VQ.save();
        el.querySelector('#vfb').innerHTML = note(res.ok ? 'ok' : 'ng', res.msg) + (res.ok ? next('次へ進む') : '');
        if (res.ok) el.querySelector('#go').onclick = function () { done('v'); };
      });
    };
  };

  window.VQ_GAMES = G;
  window.VQ_ESC = esc;
  VQ.copy = copy;
})();
