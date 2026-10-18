// GitHubの公開APIを使った「ミッション達成チェック」(ログイン・トークン不要)
(function () {
  function gh(path) {
    return fetch('https://api.github.com' + path, { headers: { Accept: 'application/vnd.github+json' } }).then(function (r) {
      if (r.status === 403 || r.status === 429) throw new Error('RATE');
      return r.json().catch(function () { return null; }).then(function (j) { return { status: r.status, json: j }; });
    });
  }
  function fail(msg) { return { ok: false, msg: msg }; }
  function pass(msg) { return { ok: true, msg: msg }; }
  var RATE = 'GitHubの確認回数の上限に達しました。しばらく待つか、下の「自己申告で完了にする」を使ってください。';

  var K = {
    user: function (v, st) {
      var u = (v.user || '').trim();
      if (!/^[A-Za-z0-9-]{1,39}$/.test(u)) return Promise.resolve(fail('ユーザー名は半角英数字とハイフンだけです。'));
      return gh('/users/' + u).then(function (r) {
        if (r.status !== 200) return fail('「' + u + '」というGitHubユーザーが見つかりません。スペルを確認してください。');
        st.gh = r.json.login; return pass('✅ ' + r.json.login + ' さんを確認しました！');
      });
    },
    repo: function (v, st, cfg) {
      var u = st.gh, name = (v.repo || '').trim();
      if (!u) return Promise.resolve(fail('先にステージ2でGitHubユーザー名の確認を済ませてください(右上の進捗ページからも入力できます)。'));
      if (!/^[\w.-]+$/.test(name)) return Promise.resolve(fail('リポジトリ名が正しくありません。'));
      st.repos[cfg.repoKey] = name;
      var base = '/repos/' + u + '/' + name;
      return gh(base).then(function (r) {
        if (r.status !== 200) return fail('リポジトリ「' + u + '/' + name + '」が見つかりません。名前とPublic(公開)設定を確認してください。');
        return gh(base + '/commits?per_page=100').then(function (c) {
          var n = Array.isArray(c.json) ? c.json.length : 0;
          if (n < (cfg.minCommits || 1)) return fail('コミットが ' + n + ' 件です。あと ' + ((cfg.minCommits || 1) - n) + ' 件以上必要です(AIに作業させて「コミットして」と頼みましょう)。');
          var files = cfg.files || [];
          return Promise.all(files.map(function (f) { return gh(base + '/contents/' + f); })).then(function (rs) {
            var miss = files.filter(function (f, i) { return rs[i].status !== 200; });
            if (miss.length) return fail('次のファイルがまだ見つかりません: ' + miss.join(', '));
            return pass('✅ リポジトリを確認しました(コミット ' + n + ' 件)。');
          });
        });
      });
    },
    secrets: function (v, st, cfg) {
      return K.repo(v, st, cfg).then(function (res) {
        if (!res.ok) return res;
        var base = '/repos/' + st.gh + '/' + st.repos[cfg.repoKey];
        return Promise.all([gh(base + '/contents/.env'), gh(base + '/contents/.gitignore')]).then(function (rs) {
          if (rs[0].status === 200) return fail('🚨 .env がGitHubに載っています! すぐキーを無効化(Revoke)して、AIに「.envをGitの管理から外して」と頼んでください。');
          if (rs[1].status !== 200) return fail('.gitignore がまだありません。AIに作ってもらいましょう。');
          var txt = ''; try { txt = decodeURIComponent(escape(atob(rs[1].json.content.replace(/\n/g, '')))); } catch (e) {}
          if (!/^\s*\/?\.env(\*|\.\*|\.local)?\s*$/m.test(txt)) return fail('.gitignore に「.env」の行が見当たりません。');
          return pass('✅ .env は載っておらず、.gitignore で守られています。');
        });
      });
    },
    url: function (v, st, cfg) {
      var u = (v.url || '').trim();
      if (!/^https:\/\//i.test(u)) return Promise.resolve(fail('https:// で始まるURLを入力してください。'));
      if (/localhost|127\.0\.0\.1/.test(u)) return Promise.resolve(fail('localhost は自分のPCだけで見えるURLです。公開URLを入力してください。'));
      if (cfg.mustInclude && u.indexOf(cfg.mustInclude) < 0) return Promise.resolve(fail('このミッションのURLには「' + cfg.mustInclude + '」が含まれるはずです。'));
      return fetch(u, { mode: 'no-cors' }).then(function () {
        st.urls[cfg.urlKey || 'default'] = u; return pass('✅ サイトにつながりました！世界中から見られる状態です。');
      }).catch(function () { return fail('そのURLに接続できません。公開直後は1〜2分かかることがあります。少し待ってもう一度どうぞ。'); });
    },
    pr: function (v, st, cfg) {
      return K.repo(v, st, cfg).then(function (res) {
        if (!res.ok) return res;
        return gh('/repos/' + st.gh + '/' + st.repos[cfg.repoKey] + '/pulls?state=closed&per_page=30').then(function (r) {
          var m = Array.isArray(r.json) && r.json.some(function (p) { return p.merged_at; });
          return m ? pass('✅ マージ済みのプルリクエストを確認しました！') : fail('マージ済みのプルリクエストが見つかりません。PRを作って「Merge」まで進めましょう。');
        });
      });
    }
  };

  window.VQ_VERIFY = function (cfg, values) {
    return K[cfg.kind](values, VQ.state, cfg).catch(function (e) {
      return fail(e && e.message === 'RATE' ? RATE : 'ネットワークエラーで確認できませんでした。通信状況を確認するか、自己申告で進めてください。');
    });
  };
})();
