// ステップの種類ごとの画面(カード / クイズ / 並べ替え / マッチ / 仕分け / 間違い探し / ミッション)
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
    function ok() { btn.textContent = 'コピーしました ✓'; setTimeout(function () { btn.textContent = 'コピー'; }, 1500); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, function () { fallback(); });
    else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) {} document.body.removeChild(ta);
    }
  }
  function note(cls, html) { return '<div class="note ' + cls + '">' + html + '</div>'; }

  var G = {};

  // ---- 読みもの(カード) ----
  G.cards = function (el, step, done) {
    var i = 0, n = step.cards.length;
    (function draw() {
      var c = step.cards[i];
      el.innerHTML = '<div class="card big"><h3>' + c.h + '</h3><div class="body">' + c.b + '</div></div>' +
        '<div class="row"><button class="btn ghost" id="pv"' + (i === 0 ? ' disabled' : '') + '>← 前へ</button><span>' + (i + 1) + ' / ' + n + '</span>' +
        '<button class="btn" id="nx">' + (i === n - 1 ? '読み終えた！' : '次へ →') + '</button></div>';
      el.querySelector('#pv').onclick = function () { i--; draw(); };
      el.querySelector('#nx').onclick = function () { if (i === n - 1) done('o'); else { i++; draw(); } };
    })();
  };

  // ---- クイズ ----
  G.quiz = function (el, step, done) {
    var qi = 0, qs = step.questions;
    (function draw() {
      var q = qs[qi], tried = {};
      el.innerHTML = '<div class="card"><div class="crumb">問題 ' + (qi + 1) + ' / ' + qs.length + '</div><h3>' + q.q + '</h3><div id="opts">' +
        q.options.map(function (o, i) { return '<button class="opt" data-i="' + i + '">' + o + '</button>'; }).join('') + '</div><div id="fb"></div></div>';
      el.querySelectorAll('.opt').forEach(function (b) {
        b.onclick = function () {
          var i = +b.dataset.i, fb = el.querySelector('#fb');
          if (i === q.answer) {
            el.querySelectorAll('.opt').forEach(function (x) { x.disabled = true; });
            b.classList.add('right');
            fb.innerHTML = note('ok', '⭕ 正解！ ' + q.explain) + '<div class="row"><span></span><button class="btn" id="go">' + (qi === qs.length - 1 ? 'クリア！' : '次の問題 →') + '</button></div>';
            fb.querySelector('#go').onclick = function () { if (qi === qs.length - 1) done('o'); else { qi++; draw(); } };
          } else if (!tried[i]) {
            tried[i] = 1; b.classList.add('wrong'); b.disabled = true;
            fb.innerHTML = note('ng', '❌ おしい！ もう一度考えてみよう。' + (q.hint ? '<br>ヒント: ' + q.hint : ''));
          }
        };
      });
    })();
  };

  // ---- 並べ替え ----
  G.order = function (el, step, done) {
    var pool = shuffle(step.items, true), ans = [];
    function draw(msg) {
      el.innerHTML = '<div class="card"><h3>' + step.prompt + '</h3><p class="lead">下の項目をタップして、正しい順に上の枠へ入れよう。入れたものをタップすると戻せます。</p>' +
        '<div class="slot" id="ans">' + (ans.length ? ans.map(function (t, i) { return '<button class="chip" data-a="' + i + '"><span class="num">' + (i + 1) + '</span>' + t + '</button>'; }).join('') : '<span class="lead">ここに並べる</span>') + '</div>' +
        '<div id="pool">' + pool.map(function (t, i) { return '<button class="chip" data-p="' + i + '">' + t + '</button>'; }).join('') + '</div>' +
        '<div id="fb">' + (msg || '') + '</div>' +
        '<div class="row"><button class="btn ghost" id="rs">やり直す</button><button class="btn" id="ck"' + (pool.length ? ' disabled' : '') + '>答え合わせ</button></div></div>';
      el.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { ans.push(pool.splice(+b.dataset.p, 1)[0]); draw(); }; });
      el.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { pool.push(ans.splice(+b.dataset.a, 1)[0]); draw(); }; });
      el.querySelector('#rs').onclick = function () { pool = shuffle(step.items, true); ans = []; draw(); };
      el.querySelector('#ck').onclick = function () {
        var wrong = ans.filter(function (t, i) { return t !== step.items[i]; }).length;
        if (!wrong) { draw(note('ok', '⭕ 完璧！ ' + (step.explain || '')) + '<div class="row"><span></span><button class="btn" id="go">クリア！</button></div>'); el.querySelector('#go').onclick = function () { done('o'); }; el.querySelector('#ck').disabled = true; }
        else draw(note('ng', '❌ ' + wrong + ' か所ちがうよ。順番を見直してみよう。'));
      };
    }
    draw();
  };

  // ---- 用語マッチ ----
  G.match = function (el, step, done) {
    var rights = shuffle(step.pairs.map(function (p) { return p[1]; })), selL = null, hit = 0;
    el.innerHTML = '<div class="card"><h3>' + step.prompt + '</h3><p class="lead">左の言葉をタップして、右の説明をタップ。</p><div class="cols"><div id="L">' +
      step.pairs.map(function (p, i) { return '<button class="opt" data-l="' + i + '">' + p[0] + '</button>'; }).join('') + '</div><div id="R">' +
      rights.map(function (t, i) { return '<button class="opt" data-r="' + i + '">' + t + '</button>'; }).join('') + '</div></div><div id="fb"></div></div>';
    var L = el.querySelectorAll('[data-l]'), R = el.querySelectorAll('[data-r]');
    L.forEach(function (b) { b.onclick = function () { L.forEach(function (x) { x.classList.remove('sel'); }); b.classList.add('sel'); selL = +b.dataset.l; }; });
    R.forEach(function (b) {
      b.onclick = function () {
        if (selL == null) { el.querySelector('#fb').innerHTML = note('', '先に左の言葉を選んでね。'); return; }
        if (step.pairs[selL][1] === rights[+b.dataset.r]) {
          b.classList.add('matched'); L[selL].classList.remove('sel'); L[selL].classList.add('matched'); selL = null; hit++;
          if (hit === step.pairs.length) { el.querySelector('#fb').innerHTML = note('ok', '⭕ 全部そろった！') + '<div class="row"><span></span><button class="btn" id="go">クリア！</button></div>'; el.querySelector('#go').onclick = function () { done('o'); }; }
        } else { b.classList.add('shake'); setTimeout(function () { b.classList.remove('shake'); }, 350); }
      };
    });
  };

  // ---- 仕分け ----
  G.sort = function (el, step, done) {
    var items = shuffle(step.items), i = 0, miss = 0;
    (function draw(msg) {
      if (i >= items.length) {
        el.innerHTML = '<div class="card"><h3>🎉 仕分け完了！</h3><p>まちがい: ' + miss + ' 回</p><div class="row"><span></span><button class="btn" id="go">クリア！</button></div></div>';
        el.querySelector('#go').onclick = function () { done('o'); }; return;
      }
      el.innerHTML = '<div class="card"><div class="crumb">' + (i + 1) + ' / ' + items.length + '</div><h3>' + step.prompt + '</h3>' +
        '<div class="card" style="text-align:center;font-size:20px;font-weight:700">' + items[i].t + '</div>' +
        '<div class="cols">' + step.buckets.map(function (b) { return '<button class="opt" data-b="' + b.id + '" style="text-align:center">' + b.label + '</button>'; }).join('') + '</div><div id="fb">' + (msg || '') + '</div></div>';
      el.querySelectorAll('[data-b]').forEach(function (b) {
        b.onclick = function () {
          if (b.dataset.b === items[i].bucket) { var w = items[i].why; i++; draw(note('ok', '⭕ ' + w)); }
          else { miss++; el.querySelector('#fb').innerHTML = note('ng', '❌ ちがうかも… ' + items[i].why); }
        };
      });
    })();
  };

  // ---- 間違い探し(危険な行をクリック) ----
  G.spot = function (el, step, done) {
    var sel = {};
    function draw(res) {
      el.innerHTML = '<div class="card"><h3>' + step.prompt + '</h3><p class="lead">危険だと思う行をタップして選択(もう一度タップで解除)。</p><pre class="code">' +
        step.lines.map(function (l, i) {
          var c = 'codeline'; if (sel[i]) c += ' sel';
          if (res) { if (l.bad && sel[i]) c += ' right'; else if (!l.bad && sel[i]) c += ' wrong'; else if (l.bad) c += ' miss'; }
          return '<span class="' + c + '" data-i="' + i + '">' + esc(l.t) + '</span>';
        }).join('') + '</pre><div id="fb">' + (res || '') + '</div>' +
        '<div class="row"><span></span><button class="btn" id="ck">チェックする</button></div></div>';
      if (!res) el.querySelectorAll('.codeline').forEach(function (s) { s.onclick = function () { sel[s.dataset.i] = !sel[s.dataset.i]; s.classList.toggle('sel'); }; });
      el.querySelector('#ck').onclick = function () {
        var bad = step.lines.map(function (l, i) { return l.bad ? i : -1; }).filter(function (x) { return x >= 0; });
        var okAll = step.lines.every(function (l, i) { return !!l.bad === !!sel[i]; });
        var why = bad.map(function (i) { return '<li><code>' + esc(step.lines[i].t.trim()) + '</code> … ' + step.lines[i].why + '</li>'; }).join('');
        if (okAll) { draw(note('ok', '⭕ 全部見つけた！<ul>' + why + '</ul>') + '<div class="row"><span></span><button class="btn" id="go">クリア！</button></div>'); el.querySelector('#go').onclick = function () { done('o'); }; el.querySelector('#ck').remove(); }
        else { draw(note('ng', '❌ まだ見落とし、または選びすぎがあります。黄色の点線=見落とし、赤=選びすぎ。もう一度挑戦！<br>(ヒント: 危険な行は ' + bad.length + ' か所)')); sel = {}; el.querySelector('#ck').textContent = 'もう一度'; el.querySelector('#ck').onclick = function () { draw(); }; }
      };
    }
    draw();
  };

  // ---- ミッション(実際に自分でやる) ----
  G.mission = function (el, step, done) {
    var S = VQ.state, chk = S.chk[step.id] || (S.chk[step.id] = []), v = step.verify, already = S.done[step.id];
    function html() {
      var h = '<div class="card"><h3>🎯 ミッション: ' + step.goal + '</h3>';
      if (step.why) h += '<p class="lead">' + step.why + '</p>';
      h += '<ul class="todo">' + step.todo.map(function (t, i) { return '<li><input type="checkbox" id="c' + i + '"' + (chk[i] ? ' checked' : '') + '><label for="c' + i + '">' + t + '</label></li>'; }).join('') + '</ul>';
      (step.prompts || []).forEach(function (p, i) { h += '<div class="prompt"><span class="lbl">📋 ' + esc(p.label) + '</span><button class="btn sm" data-cp="' + i + '">コピー</button>' + esc(p.text) + '</div>'; });
      (step.tips || []).forEach(function (t) { h += '<details><summary>' + t.h + '</summary><div class="body">' + t.b + '</div></details>'; });
      if (step.warn) h += note('ng', step.warn);
      h += '</div>';
      if (v) {
        h += '<div class="card"><h3>✅ 達成チェック</h3>';
        if (v.kind === 'user') h += '<label class="f">GitHubのユーザー名</label><input type="text" id="v-user" placeholder="例: taro-yamada" value="' + esc(S.gh) + '">';
        else if (v.kind === 'url') h += '<label class="f">公開されたURL</label><input type="text" id="v-url" placeholder="https://..." value="' + esc(S.urls[v.urlKey || 'default'] || '') + '">';
        else h += '<label class="f">GitHubのユーザー名</label><input type="text" id="v-user" value="' + esc(S.gh) + '" placeholder="先にステージ2で確認済みなら自動入力されます"><label class="f">リポジトリ名</label><input type="text" id="v-repo" value="' + esc(S.repos[v.repoKey]) + '">';
        h += '<div class="row"><span class="lead" style="margin:0">自動で確認します(GitHubの公開情報だけを見ます)</span><button class="btn" id="vgo">確認する</button></div><div id="vfb"></div>';
        h += '<details><summary>うまく確認できないとき</summary>' + '<p>上のやることを全部チェックしたうえで、自己申告で完了にできます(先生には「自己申告」と表示されます)。</p><button class="btn ghost" id="self">自己申告で完了にする</button></details></div>';
      } else {
        h += '<div class="row"><span class="lead" style="margin:0">全部できたらチェックを入れて完了！</span><button class="btn" id="self">できた！</button></div>';
      }
      if (already) h += note('ok', '✔ このミッションは完了済みです (' + (already === 'v' ? '自動確認' : '自己申告') + ')。');
      return h;
    }
    el.innerHTML = html();
    el.querySelectorAll('.todo input').forEach(function (c, i) { c.onchange = function () { chk[i] = c.checked; VQ.save(); }; });
    el.querySelectorAll('[data-cp]').forEach(function (b) { b.onclick = function () { copy(step.prompts[+b.dataset.cp].text, b); }; });
    var self = el.querySelector('#self');
    if (self) self.onclick = function () {
      if (!step.todo.every(function (t, i) { return chk[i]; })) { VQ.toast('先に「やること」を全部チェックしてね'); return; }
      done('s');
    };
    var go = el.querySelector('#vgo');
    if (go) go.onclick = function () {
      var u = el.querySelector('#v-user'), r = el.querySelector('#v-repo'), w = el.querySelector('#v-url');
      if (u) S.gh = u.value.trim();
      go.disabled = true; go.textContent = '確認中…';
      VQ_VERIFY(v, { user: u && u.value, repo: r && r.value, url: w && w.value }).then(function (res) {
        go.disabled = false; go.textContent = '確認する'; VQ.save();
        el.querySelector('#vfb').innerHTML = note(res.ok ? 'ok' : 'ng', res.msg) + (res.ok ? '<div class="row"><span></span><button class="btn" id="vdone">次へ進む</button></div>' : '');
        if (res.ok) { el.querySelector('#vdone').onclick = function () { done('v'); }; }
      });
    };
  };

  window.VQ_GAMES = G;
  window.VQ_ESC = esc;
})();
