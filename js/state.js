// 進捗の保存(ブラウザのlocalStorage)と、XP・レベル・差し込み文字の計算
(function () {
  var KEY = 'vq-progress-v1';
  var LEVELS = ['見習い', 'ブラウザ探検家', 'ウェブ冒険者', 'Git使い', 'プロンプト職人', '公開マスター', 'キー守護者', 'サーバー使い', 'メンテの達人', 'バイブコーダー'];
  var ENV = { anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY', gemini: 'GEMINI_API_KEY' };
  var PROVIDER = { anthropic: 'Anthropic Claude API', openai: 'OpenAI API', gemini: 'Google Gemini API' };
  var GIT = {
    agent: '最後にコミットして、mainブランチにpushしてください。',
    chat: 'ファイルごとに「ファイル名(フォルダ付き)」と「中身」を分けて、コピーしやすいコードブロックで出してください。私はGitHubの画面から手動で追加するので、その手順も教えてください。'
  };
  var PR = {
    agent: 'mainに直接ではなく、新しいブランチを作って変更し、プルリクエストを作ってください。',
    chat: '変更後のファイルの全文を、ファイル名つきで出してください。私はGitHubの画面で新しいブランチを作り、プルリクエストにします。'
  };

  function fresh() {
    return { v: 1, name: '', gh: '', tool: '', provider: '', repos: { first: 'my-first-app', chat: 'my-ai-chat' }, urls: {}, done: {}, chk: {}, unlockAll: false };
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

  var DEFAULT_MIN = { cards: 4, quiz: 3, order: 2, match: 2, sort: 3, spot: 3, choose: 2, setup: 1, mission: 10 };
  function minOf(step) { return step.min || DEFAULT_MIN[step.type] || 3; }
  function allSteps() {
    var out = [];
    VQ_CONTENT.stages.forEach(function (st, si) { st.steps.forEach(function (s, i) { out.push({ stage: st, si: si, step: s, i: i }); }); });
    return out;
  }
  function xpOf(step) { return step.xp || (step.type === 'mission' ? 50 : 20); }
  function maxXp() { return allSteps().reduce(function (a, x) { return a + xpOf(x.step); }, 0); }
  function totalXp() { return allSteps().reduce(function (a, x) { return a + (state.done[x.step.id] ? xpOf(x.step) : 0); }, 0); }
  function level() {
    var n = Math.min(LEVELS.length - 1, Math.floor(totalXp() / maxXp() * LEVELS.length));
    return { n: n + 1, title: LEVELS[n], of: LEVELS.length };
  }
  function stageProgress(st) {
    var d = st.steps.filter(function (s) { return state.done[s.id]; }).length;
    return { done: d, total: st.steps.length, clear: d === st.steps.length };
  }
  function stageMinutes(st) { return st.steps.reduce(function (a, s) { return a + minOf(s); }, 0); }
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
  // {{ENV}} などの差し込み。選んだAIツール・APIサービスに合わせて教材の文面が変わる
  function fill(text) {
    var p = state.provider || 'anthropic', t = state.tool || 'agent';
    return String(text)
      .replace(/\{\{ENV\}\}/g, ENV[p]).replace(/\{\{PROVIDER\}\}/g, PROVIDER[p])
      .replace(/\{\{GIT\}\}/g, GIT[t]).replace(/\{\{PR\}\}/g, PR[t])
      .replace(/\{\{USER\}\}/g, state.gh || 'ユーザー名');
  }
  function matches(only) { return !only || only === state.tool || only === state.provider || (only === 'agent' && !state.tool); }
  function exportCode() {
    var d = { v: 1, n: state.name, g: state.gh, tl: state.tool, pv: state.provider, r: state.repos, u: state.urls, d: state.done };
    return btoa(unescape(encodeURIComponent(JSON.stringify(d))));
  }
  function importCode(code) {
    var d = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (d.v !== 1) throw new Error('version');
    state.name = d.n || ''; state.gh = d.g || ''; state.tool = d.tl || ''; state.provider = d.pv || '';
    state.repos = Object.assign(state.repos, d.r || {}); state.urls = d.u || {}; state.done = d.d || {};
    save();
  }
  function reset() { state = fresh(); VQ.state = state; save(); }

  window.VQ = { state: state, save: save, allSteps: allSteps, xpOf: xpOf, maxXp: maxXp, minOf: minOf, totalXp: totalXp, level: level,
    stageProgress: stageProgress, stageMinutes: stageMinutes, unlocked: unlocked, complete: complete, report: report,
    fill: fill, matches: matches, exportCode: exportCode, importCode: importCode, reset: reset, LEVELS: LEVELS };
})();
