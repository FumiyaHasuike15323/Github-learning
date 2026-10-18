// 進捗の送り先(GitHubリポジトリ)。GitHub Pages上では自動で判定し、それ以外はここの値を使います。
(function () {
  var cfg = { owner: 'FumiyaHasuike15323', repo: 'Github-learning' };
  var m = location.hostname.match(/^(.+)\.github\.io$/);
  var seg = location.pathname.split('/')[1];
  if (m && seg) { cfg.owner = m[1]; cfg.repo = seg; }
  var q = new URLSearchParams(location.search).get('repo');
  if (q && q.indexOf('/') > 0) { cfg.owner = q.split('/')[0]; cfg.repo = q.split('/')[1]; }
  window.VQ_CONFIG = cfg;
})();
