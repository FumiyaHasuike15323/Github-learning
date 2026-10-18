// 進捗の保存(ブラウザのlocalStorage)と、XP・レベルの計算
(function () {
  var KEY = 'vq-progress-v1';
  var LEVELS = ['見習い', 'ブラウザ探検家', 'Git使い', 'プロンプト職人', '公開マスター', 'キー守護者', 'サーバー使い', 'メンテの達人'];

  function fresh() {
    return { v: 1, name: '', gh: '', repos: { first: 'my-first-app', chat: 'my-ai-chat' }, urls: {}, done: {}, chk: {}, unlockAll: false };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1) return Object.assign(fresh(), s);
    } catch (e) {}
    return fresh();
  }
  var state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function allSteps() {
    var out = [];
    VQ_CONTENT.stages.forEach(function (st, si) { st.steps.forEach(function (s, i) { out.push({ stage: st, si: si, step: s, i: i }); }); });
    return out;
  }
  function xpOf(step) { return step.xp || (step.type === 'mission' ? 50 : 20); }
  function totalXp() {
    return allSteps().reduce(function (a, x) { return a + (state.done[x.step.id] ? xpOf(x.step) : 0); }, 0);
  }
  function level() {
    var n = Math.min(LEVELS.length - 1, Math.floor(totalXp() / 100));
    return { n: n + 1, title: LEVELS[n] };
  }
  function stageProgress(st) {
    var d = st.steps.filter(function (s) { return state.done[s.id]; }).length;
    return { done: d, total: st.steps.length, clear: d === st.steps.length };
  }
  function unlocked(si) {
    if (state.unlockAll || si === 0) return true;
    return stageProgress(VQ_CONTENT.stages[si - 1]).clear;
  }
  function complete(stepId, how) {
    var first = !state.done[stepId];
    if (first || (how === 'v' && state.done[stepId] !== 'v')) state.done[stepId] = how || 'o';
    save();
    return first;
  }
  function report() {
    var stages = VQ_CONTENT.stages.map(function (st) { var p = stageProgress(st); return st.emoji + ' ' + st.title + ': ' + p.done + '/' + p.total + (p.clear ? ' ✅' : ''); });
    return { stages: stages, xp: totalXp(), lv: level() };
  }
  function exportCode() {
    var d = { v: 1, n: state.name, g: state.gh, r: state.repos, u: state.urls, d: state.done };
    return btoa(unescape(encodeURIComponent(JSON.stringify(d))));
  }
  function importCode(code) {
    var d = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (d.v !== 1) throw new Error('version');
    state.name = d.n || ''; state.gh = d.g || ''; state.repos = Object.assign(state.repos, d.r || {});
    state.urls = d.u || {}; state.done = d.d || {};
    save();
  }
  function reset() { state = fresh(); VQ.state = state; save(); }

  window.VQ = { state: state, save: save, allSteps: allSteps, xpOf: xpOf, totalXp: totalXp, level: level,
    stageProgress: stageProgress, unlocked: unlocked, complete: complete, report: report,
    exportCode: exportCode, importCode: importCode, reset: reset };
})();
