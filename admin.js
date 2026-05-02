const { demoTime, games: fallbackGames, booths: fallbackBooths } = window.EVENT_DATA;
const demoMinutes = toMinutes(demoTime);

const SUPABASE_URL = "https://texlipqnzkoylzeowvyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_S63yxUuVD_ld3bV0-aACUw_sck9ipiF";

const app = document.querySelector("#admin-app");
const topbarNote = document.querySelector("#admin-topbar-note");
const topbarActions = document.querySelector("#admin-topbar-actions");
const tabs = document.querySelector("#admin-tabs");

const state = {
  tab: "dashboard",
  adminFormId: null,
  loading: true,
  auth: {
    client: null,
    subscription: null,
    session: null,
    user: null,
    error: "",
    pending: null,
    contextPromise: null,
    contextRequestId: 0,
  },
  admin: null,
  assignments: [],
  games: [],
  booths: [],
  teams: [],
  gameResults: [],
  resultSets: [],
  gameRankings: [],
  scoreboard: null,
  formFeedback: {
    kind: "",
    text: "",
  },
};

boot();

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTimeLabel(time) {
  const [hoursText, minutes] = time.split(":");
  const hours = Number(hoursText);
  const period = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${period} ${displayHour}:${minutes}`;
}

function formatRange(start, end) {
  return `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`;
}

function timestampToClock(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getStatus(start, end) {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (demoMinutes >= startMinutes && demoMinutes < endMinutes) return "진행 중";
  if (demoMinutes >= endMinutes) return "종료";
  return "예정";
}

function getBoothStatus(booth) {
  return getStatus(booth.start, booth.end).replace("진행 중", "운영 중");
}

function statusClass(status) {
  if (status === "진행 중" || status === "운영 중") return "live";
  if (status === "종료" || status === "완료") return "done";
  if (status === "대진 미완성") return "alert";
  return "next";
}

function isLoggedIn() {
  return Boolean(state.auth.session && state.admin);
}

function isSuperAdmin() {
  return state.admin?.role === "super_admin";
}

function clearAdminState() {
  state.admin = null;
  state.assignments = [];
  state.games = [];
  state.booths = [];
  state.teams = [];
  state.gameResults = [];
  state.resultSets = [];
  state.gameRankings = [];
  state.scoreboard = null;
  state.formFeedback = { kind: "", text: "" };
}

function currentGames() {
  return state.games.filter((game) => getStatus(game.start, game.end) === "진행 중");
}

function upcomingGames(limit = 3) {
  return state.games
    .filter((game) => toMinutes(game.start) > demoMinutes)
    .sort((left, right) => toMinutes(left.start) - toMinutes(right.start))
    .slice(0, limit);
}

function getGame(id) {
  return state.games.find((game) => game.id === id);
}

function getBooth(id) {
  return state.booths.find((booth) => booth.id === id);
}

function getGameResult(gameId) {
  return state.gameResults.find((result) => result.gameId === gameId);
}

function getResultSets(gameResultId) {
  return state.resultSets
    .filter((set) => set.gameResultId === gameResultId)
    .sort((left, right) => left.setNumber - right.setNumber);
}

function getGameRankings(gameId) {
  return state.gameRankings
    .filter((ranking) => ranking.gameId === gameId)
    .sort((left, right) => left.rankOrder - right.rankOrder);
}

function getTeamName(teamId) {
  return state.teams.find((team) => team.id === teamId)?.name ?? "미정";
}

function getAssignedGames() {
  return state.assignments
    .filter((assignment) => assignment.gameId)
    .map((assignment) => getGame(assignment.gameId))
    .filter(Boolean);
}

function getAssignedBooths() {
  return state.assignments
    .filter((assignment) => assignment.boothId)
    .map((assignment) => getBooth(assignment.boothId))
    .filter(Boolean);
}

function isRpcGame(game) {
  const sport = String(game?.sport ?? "");
  return Boolean(
    game &&
      game.kind === "game" &&
      (["농구", "풋살", "줄다리기", "계주"].includes(sport) || sport.includes("피구")),
  );
}

function getEditableGames() {
  const source = isSuperAdmin() ? state.games : getAssignedGames();
  return source.filter(isRpcGame);
}

function getInputWaitingItems() {
  return [...getEditableGames(), ...getAssignedBooths()].map((item) => {
    const isGame = "sport" in item;
    const status = isGame ? getStatus(item.start, item.end) : getBoothStatus(item);
    return {
      type: isGame ? "game" : "booth",
      id: item.id,
      title: item.title ?? item.name,
      subtitle: isGame ? `${item.summary} · ${formatRange(item.start, item.end)}` : `${item.location} · ${status}`,
      action: isGame ? "결과 입력" : "상태 입력",
      status,
    };
  });
}

function getGameReadiness(gameId) {
  const game = getGame(gameId);
  if (!game) return { ready: false, reason: "경기 정보를 찾지 못했습니다.", dependsOn: [] };

  if (isRpcGame(game) && game.sport !== "계주") {
    const result = getGameResult(gameId);
    if (!result?.leftTeamId || !result?.rightTeamId) {
      const qualifierNames = [`${game.sport} 예선 1`, `${game.sport} 예선 2`];
      const finalNames = [`${game.sport} 부결승`, `${game.sport} 결승`];
      return {
        ready: false,
        reason: finalNames.includes(game.title)
          ? "대진 양쪽 팀이 아직 확정되지 않았습니다. 앞 경기 결과 저장 후 자동 배정됩니다."
          : "이 경기의 left/right 팀 정보가 아직 없습니다.",
        dependsOn: game.title.includes("부결승") || game.title.includes("결승") ? qualifierNames : [],
      };
    }

    return { ready: true, reason: "", dependsOn: [] };
  }

  const blocked = {
    "농구 부결승": {
      ready: false,
      reason: "예선 1, 2 결과가 모두 확정되어야 대진이 완성됩니다.",
      dependsOn: ["농구 예선 1", "농구 예선 2"],
    },
    "줄다리기 부결승": {
      ready: false,
      reason: "예선 1, 2 결과 비교가 끝나야 weaker_winner가 정해집니다.",
      dependsOn: ["줄다리기 예선 1", "줄다리기 예선 2"],
    },
  };

  return blocked[game.title] ?? { ready: true, reason: "", dependsOn: [] };
}

async function boot() {
  try {
    initSupabaseClient();
  } catch (error) {
    state.auth.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
}

function initSupabaseClient() {
  if (state.auth.client) return state.auth.client;

  state.auth.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const {
    data: { subscription },
  } = state.auth.client.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => {
      void syncSession(session);
    }, 0);
  });

  state.auth.subscription = subscription;
  return state.auth.client;
}

async function syncSession(session) {
  const previousUserId = state.auth.user?.id ?? null;
  const nextUserId = session?.user?.id ?? null;
  const sameLoggedInUser = Boolean(state.admin && previousUserId && previousUserId === nextUserId);

  state.auth.session = session;
  state.auth.user = session?.user ?? null;

  if (!state.auth.user) {
    clearAdminState();
    state.loading = false;
    render();
    return;
  }

  if (sameLoggedInUser) {
    state.loading = false;
    return;
  }

  await loadAdminContext();
}

async function loadAdminContext({ silent = false } = {}) {
  if (!state.auth.client || !state.auth.user) return;
  if (state.auth.contextPromise) return state.auth.contextPromise;

  if (!silent) {
    state.loading = true;
    render();
  }

  const userId = state.auth.user.id;
  const requestId = ++state.auth.contextRequestId;
  const loadPromise = (async () => {
    try {
      const { data: context, error: contextError } = await state.auth.client.rpc("get_admin_context");

      if (requestId !== state.auth.contextRequestId || state.auth.user?.id !== userId) return;
      if (contextError) throw new Error(`get_admin_context 조회 실패: ${contextError.message}`);

      if (!context?.ok) {
        clearAdminState();
        state.auth.error = "admins 테이블에서 현재 로그인 사용자와 연결된 운영진 정보를 찾지 못했습니다.";
        state.loading = false;
        render();
        return;
      }

      const admin = context.admin;
      const fallbackGameMap = new Map(fallbackGames.map((game) => [game.title, game]));
      const fallbackBoothMap = new Map(fallbackBooths.map((booth) => [booth.name, booth]));

      state.admin = admin;
      state.games = (context.games ?? []).map((row) => {
        const fallback = fallbackGameMap.get(row.title) ?? {};
        return {
          id: row.id,
          title: row.title,
          sport: row.sport,
          kind: row.kind,
          location: row.location,
          summary: row.summary ?? fallback.summary ?? "",
          dependency: fallback.dependency ?? "",
          mapKey: fallback.mapKey ?? "",
          start: timestampToClock(row.scheduled_start_time),
          end: timestampToClock(row.scheduled_end_time),
          status: row.status,
        };
      });

      state.booths = (context.booths ?? []).map((row) => {
        const fallback = fallbackBoothMap.get(row.name) ?? {};
        return {
          id: row.id,
          name: row.name,
          location: row.location,
          summary: row.summary ?? fallback.summary ?? "",
          guide: row.guide ?? fallback.guide ?? "",
          mapCaption: fallback.mapCaption ?? "",
          currentSession: fallback.currentSession ?? "",
          leaderboard: fallback.leaderboard ?? null,
          teamTotals: fallback.teamTotals ?? null,
          start: timestampToClock(row.scheduled_start_time),
          end: timestampToClock(row.scheduled_end_time),
          status: row.status,
        };
      });

      state.teams = (context.teams ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        displayOrder: row.display_order,
        isActive: row.is_active,
      }));

      state.gameResults = (context.game_results ?? []).map((row) => ({
        id: row.id,
        gameId: row.game_id,
        leftTeamId: row.left_team_id,
        rightTeamId: row.right_team_id,
        leftScore: row.left_score,
        rightScore: row.right_score,
        winnerTeamId: row.winner_team_id,
        tiebreakType: row.tiebreak_type,
        leftTiebreakScore: row.left_tiebreak_score,
        rightTiebreakScore: row.right_tiebreak_score,
        note: row.note ?? "",
      }));

      state.resultSets = (context.game_result_sets ?? []).map((row) => ({
        id: row.id,
        gameResultId: row.game_result_id,
        setNumber: row.set_number,
        leftScore: row.left_score,
        rightScore: row.right_score,
        durationSeconds: row.duration_seconds,
        note: row.note ?? "",
      }));

      state.gameRankings = (context.game_rankings ?? []).map((row) => ({
        id: row.id,
        gameId: row.game_id,
        teamId: row.team_id,
        rankOrder: row.rank_order,
        recordValue: row.record_value ?? "",
        pointsAwarded: row.points_awarded,
        note: row.note ?? "",
      }));

      state.scoreboard = context.scoreboard ?? null;

      state.assignments = (context.assignments ?? [])
        .filter((assignment) => assignment.admin_id === admin.id && assignment.is_active)
        .map((assignment) => ({
          id: assignment.id,
          gameId: assignment.game_id,
          boothId: assignment.booth_id,
          role: assignment.assignment_role,
        }));

      state.auth.error = "";
      state.loading = false;
      if (!silent) render();
    } catch (error) {
      if (requestId !== state.auth.contextRequestId || state.auth.user?.id !== userId) return;
      if (silent) {
        console.warn("관리자 정보 조용한 재조회 실패:", error.message);
        state.auth.error = error.message;
        state.loading = false;
        return;
      }
      clearAdminState();
      state.auth.error = error.message;
      state.loading = false;
      render();
    }
  })();

  state.auth.contextPromise = loadPromise;
  try {
    await loadPromise;
  } finally {
    if (state.auth.contextPromise === loadPromise) {
      state.auth.contextPromise = null;
    }
  }
}

async function handleLoginSubmit(formData) {
  if (!state.auth.client) {
    state.auth.error = "Supabase 클라이언트가 초기화되지 않았습니다.";
    render();
    return;
  }

  if (state.auth.pending === "login") {
    state.auth.error = "이미 로그인 요청을 처리 중입니다. 잠깐만 기다려 주세요.";
    render();
    return;
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    state.auth.error = "이메일과 비밀번호를 입력해 주세요.";
    render();
    return;
  }

  state.auth.pending = "login";
  state.loading = true;
  state.auth.error = "";
  render();

  try {
    const { data, error } = await state.auth.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await syncSession(data.session ?? null);
  } catch (error) {
    state.loading = false;
    state.auth.error = error.message;
  } finally {
    state.auth.pending = null;
    render();
  }
}

async function handleLogout() {
  if (!state.auth.client) return;
  if (state.auth.pending === "logout") return;

  state.auth.pending = "logout";
  state.loading = true;
  render();

  try {
    await state.auth.client.auth.signOut();
    await syncSession(null);
  } catch (error) {
    state.auth.error = error.message;
    state.loading = false;
    render();
  } finally {
    state.auth.pending = null;
    render();
  }
}

function readIntegerField(form, name, label, { required = true, min = 0 } = {}) {
  const field = form.elements[name];
  const rawValue = String(field?.value ?? "").trim();
  if (!rawValue) {
    if (required) throw new Error(`${label} 값을 입력해 주세요.`);
    return null;
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value)) throw new Error(`${label}은 정수로 입력해 주세요.`);
  if (value < min) throw new Error(`${label}은 ${min} 이상이어야 합니다.`);
  return value;
}

function readTextField(form, name) {
  return String(form.elements[name]?.value ?? "").trim();
}

function buildScorePayload(form, game) {
  const leftScore = readIntegerField(form, "left_score", "왼쪽 정규 점수");
  const rightScore = readIntegerField(form, "right_score", "오른쪽 정규 점수");
  const tiebreakType = game.sport === "농구" ? "free_throw" : "penalty_shootout";
  const payload = {
    game_id: game.id,
    regular_score: {
      left: leftScore,
      right: rightScore,
    },
    tiebreak: {
      type: "none",
      left: null,
      right: null,
    },
    note: readTextField(form, "note"),
  };

  if (leftScore === rightScore) {
    payload.tiebreak = {
      type: tiebreakType,
      left: readIntegerField(form, "left_tiebreak_score", "왼쪽 동점 승부 점수"),
      right: readIntegerField(form, "right_tiebreak_score", "오른쪽 동점 승부 점수"),
    };
  }

  return {
    rpcName: "submit_score_game_result",
    payload,
  };
}

function buildRopePayload(form, game) {
  const sets = [];

  for (let setNumber = 1; setNumber <= 3; setNumber += 1) {
    const winner = String(form.elements[`set_${setNumber}_winner`]?.value ?? "");
    const durationRaw = String(form.elements[`set_${setNumber}_duration`]?.value ?? "").trim();

    if (!winner && !durationRaw) continue;
    if (!winner || !durationRaw) throw new Error(`${setNumber}세트는 승자와 시간을 모두 입력해 주세요.`);

    sets.push({
      set_number: setNumber,
      left_score: winner === "left" ? 1 : 0,
      right_score: winner === "right" ? 1 : 0,
      duration_seconds: readIntegerField(form, `set_${setNumber}_duration`, `${setNumber}세트 시간`, { min: 1 }),
      note: "",
    });
  }

  const leftWins = sets.filter((set) => set.left_score === 1).length;
  const rightWins = sets.filter((set) => set.right_score === 1).length;

  if (sets.length < 2 || sets.length > 3) throw new Error("줄다리기는 2세트 또는 3세트 결과가 필요합니다.");
  if (!((leftWins === 2 && rightWins < 2) || (rightWins === 2 && leftWins < 2))) {
    throw new Error("줄다리기는 한 팀이 정확히 2세트를 이겨야 합니다.");
  }

  return {
    rpcName: "submit_rope_game_result",
    payload: {
      game_id: game.id,
      sets,
      note: readTextField(form, "note"),
    },
  };
}

function buildDodgeballPayload(form, game) {
  const sets = [];

  for (let setNumber = 1; setNumber <= 3; setNumber += 1) {
    const leftRaw = String(form.elements[`set_${setNumber}_left_survivors`]?.value ?? "").trim();
    const rightRaw = String(form.elements[`set_${setNumber}_right_survivors`]?.value ?? "").trim();

    if (!leftRaw && !rightRaw) continue;
    if (!leftRaw || !rightRaw) throw new Error(`${setNumber}세트는 양쪽 생존자 수를 모두 입력해 주세요.`);

    const leftSurvivors = readIntegerField(form, `set_${setNumber}_left_survivors`, `${setNumber}세트 왼쪽 생존자`, { min: 0 });
    const rightSurvivors = readIntegerField(form, `set_${setNumber}_right_survivors`, `${setNumber}세트 오른쪽 생존자`, { min: 0 });

    if (leftSurvivors === rightSurvivors) throw new Error(`${setNumber}세트 생존자 수가 같으면 승자를 정할 수 없습니다.`);

    sets.push({
      set_number: setNumber,
      left_survivors: leftSurvivors,
      right_survivors: rightSurvivors,
      note: "",
    });
  }

  const leftWins = sets.filter((set) => set.left_survivors > set.right_survivors).length;
  const rightWins = sets.filter((set) => set.right_survivors > set.left_survivors).length;

  if (sets.length < 2 || sets.length > 3) throw new Error("피구는 2세트 또는 3세트 결과가 필요합니다.");
  if (!((leftWins === 2 && rightWins < 2) || (rightWins === 2 && leftWins < 2))) {
    throw new Error("피구는 한 팀이 정확히 2세트를 이겨야 합니다.");
  }

  return {
    rpcName: "submit_dodgeball_game_result",
    payload: {
      game_id: game.id,
      sets,
      note: readTextField(form, "note"),
    },
  };
}

function buildRelayPayload(form, game) {
  const rankings = state.teams.map((team) => ({
    team_id: team.id,
    rank_order: readIntegerField(form, `rank_${team.id}`, `${team.name} 등수`, { min: 1 }),
    record_value: readTextField(form, `record_${team.id}`),
    note: "",
  }));

  const rankValues = rankings.map((ranking) => ranking.rank_order);
  if (new Set(rankValues).size !== rankValues.length) throw new Error("계주 등수는 중복될 수 없습니다.");

  return {
    rpcName: "submit_relay_result",
    payload: {
      game_id: game.id,
      rankings,
      note: readTextField(form, "note"),
    },
  };
}

function buildResultRequest(form) {
  const game = getGame(form.dataset.gameId);
  if (!game) throw new Error("경기 정보를 찾지 못했습니다.");

  if (form.dataset.resultForm === "score") return buildScorePayload(form, game);
  if (form.dataset.resultForm === "rope") return buildRopePayload(form, game);
  if (form.dataset.resultForm === "dodgeball") return buildDodgeballPayload(form, game);
  if (form.dataset.resultForm === "relay") return buildRelayPayload(form, game);

  throw new Error("아직 저장을 지원하지 않는 입력 폼입니다.");
}

async function refreshAdminContext() {
  state.auth.contextPromise = null;
  await loadAdminContext({ silent: true });
}

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

async function handleResultSubmit(form) {
  if (!state.auth.client) return;
  if (state.auth.pending === "save") return;

  let request;
  try {
    request = buildResultRequest(form);
  } catch (error) {
    state.formFeedback = { kind: "error", text: error.message };
    render();
    return;
  }

  state.auth.pending = "save";
  state.formFeedback = { kind: "info", text: "결과를 저장하고 다음 대진과 점수를 갱신하는 중입니다." };
  render();

  try {
    const { data, error } = await withTimeout(
      state.auth.client.rpc(request.rpcName, { payload: request.payload }),
      20000,
      "저장 요청 응답이 20초를 넘었습니다. DB에 저장됐을 수 있으니 Supabase에서 결과를 먼저 확인해 주세요.",
    );
    if (error) throw error;

    const waiting = data?.advancement?.waiting ? " 아직 다음 대진은 앞 경기 결과를 더 기다리는 상태입니다." : "";
    state.formFeedback = { kind: "success", text: `저장 완료. Supabase RPC가 정상 처리되었습니다.${waiting}` };
    await withTimeout(
      refreshAdminContext(),
      10000,
      "저장은 완료됐지만 최신 데이터 다시 불러오기가 지연됐습니다. 새로고침하면 최신 상태를 볼 수 있습니다.",
    );
  } catch (error) {
    state.formFeedback = { kind: "error", text: error.message };
  } finally {
    state.auth.pending = null;
    state.loading = false;
    render();
  }
}

function updateChrome() {
  tabs.classList.toggle("hidden", !isLoggedIn());
  app.classList.toggle("no-tabs", !isLoggedIn());

  if (!isLoggedIn()) {
    topbarNote.textContent = state.loading ? "연결 확인 중" : "로그인 전";
    topbarActions.className = "topbar-actions";
    topbarActions.innerHTML = "";
    return;
  }

  topbarNote.textContent = isSuperAdmin() ? "대표 운영진 화면" : "일반 운영진 화면";
  topbarActions.className = "topbar-actions compact";
  topbarActions.innerHTML = `
    <div class="topbar-user">
      <strong>${escapeHtml(state.admin.name)}</strong>
      <span>${escapeHtml(state.admin.email)}</span>
    </div>
    <button class="ghost-button" type="button" data-logout ${state.auth.pending === "logout" ? "disabled" : ""}>
      ${state.auth.pending === "logout" ? "로그아웃 중" : "로그아웃"}
    </button>
  `;
}

function render() {
  updateChrome();

  if (state.loading) {
    app.innerHTML = `
      <section class="hero-card">
        <span class="hero-status">연결 중</span>
        <h2 class="hero-title">Supabase와 관리자 정보를 불러오는 중입니다.</h2>
        <p class="hero-meta">로그인 상태, 운영진 권한, 담당 경기 배정을 순서대로 확인하고 있습니다.</p>
      </section>
    `;
    return;
  }

  if (!state.auth.client || !state.auth.session || !state.admin) {
    renderAuthGate();
    return;
  }

  tabButtons().forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.tab);
  });

  if (state.tab === "dashboard") renderDashboard();
  if (state.tab === "assignments") renderAssignments();
  if (state.tab === "forms") renderForms();
  if (state.tab === "overview") renderOverview();
}

function renderAuthGate() {
  const loginBusy = state.auth.pending === "login";

  app.innerHTML = `
    <section class="auth-stack">
      <section class="hero-card">
        <span class="hero-status">관리자 로그인</span>
        <h2 class="hero-title">운영진 계정으로 로그인합니다.</h2>
        <p class="hero-meta">이 페이지는 코드에 고정된 Supabase 프로젝트에 연결되어 있습니다. 운영진 이메일과 비밀번호로만 로그인하면 됩니다.</p>
      </section>

      <form class="form-card" data-auth-form="login">
        <div class="section-title">
          <h2>계정 로그인</h2>
          <p>Supabase Auth</p>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>이메일</label>
            <input name="email" type="email" placeholder="lead@test.local" />
          </div>
          <div class="field">
            <label>비밀번호</label>
            <input name="password" type="password" placeholder="비밀번호 입력" />
          </div>
        </div>
        <div class="auth-status ${state.auth.error ? "error" : ""}">
          ${escapeHtml(state.auth.error || "운영진 계정으로 로그인하세요. 테스트를 위해 다른 계정으로 바꾸고 싶을 때는 로그인 후 로그아웃하면 됩니다.")}
        </div>
        <div class="action-row">
          <button class="text-button" type="submit" ${loginBusy ? "disabled" : ""}>
            ${loginBusy ? "로그인 중" : "로그인"}
          </button>
        </div>
      </form>
    </section>
  `;
}

function renderDashboard() {
  const assignedGames = getAssignedGames();
  const assignedBooths = getAssignedBooths();
  const waiting = getInputWaitingItems();
  const current = currentGames();
  const upcoming = upcomingGames();

  app.innerHTML = `
    <section class="notice">
      <span class="notice-mark">!</span>
      <p>${escapeHtml(state.admin.name)} 계정으로 로그인되었습니다. 전체 현황은 모두 읽을 수 있고, 수정은 배정된 경기와 부스만 가능하다는 전제를 기준으로 화면이 구성되어 있습니다.</p>
    </section>

    <section class="hero-card">
      <span class="hero-status">${escapeHtml(isSuperAdmin() ? "super_admin" : "operator")}</span>
      <h2 class="hero-title">${escapeHtml(state.admin.name)}</h2>
      <p class="hero-meta">${escapeHtml(isSuperAdmin() ? "전체 읽기 / 전체 쓰기 / 배정 관리" : "전체 읽기 / 내 담당만 쓰기")}</p>
      <p class="tiny-note">현재 로그인 사용자는 Supabase Auth의 유저이며, admins.auth_user_id로 운영진 정보와 연결됩니다.</p>
    </section>

    <div class="section-title">
      <h2>내 할 일</h2>
      <p>입력 화면 바로가기</p>
    </div>

    <section class="dashboard-stack">
      <div class="two-column">
        <article class="stat-card">
          <p class="stat-label">담당 경기</p>
          <p class="stat-value">${assignedGames.length}</p>
        </article>
        <article class="stat-card">
          <p class="stat-label">담당 부스</p>
          <p class="stat-value">${assignedBooths.length}</p>
        </article>
      </div>

      ${
        waiting.length
          ? waiting
              .map(
                (item) => `
                  <article class="todo-card">
                    <div class="row-head">
                      <div>
                        <h3>${escapeHtml(item.title)}</h3>
                        <p class="description">${escapeHtml(item.subtitle)}</p>
                      </div>
                      <span class="pill ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
                    </div>
                    <div class="action-row">
                      <button class="text-button" data-open-form="${escapeHtml(item.id)}" type="button">${escapeHtml(item.action)}</button>
                    </div>
                  </article>
                `,
              )
              .join("")
          : `<div class="empty-state">현재 배정된 입력 대상이 없습니다. 대표 운영진이 admin_assignments를 확인해 주세요.</div>`
      }
    </section>

    <div class="section-title">
      <h2>전체 현황</h2>
      <p>읽기 전용</p>
    </div>

    <section class="dashboard-stack">
      <article class="assignment-card">
        <div class="row-head">
          <div>
            <h3>현재 진행 중</h3>
            <p class="description">${escapeHtml(current.length ? current.map((item) => item.title).join(" / ") : "현재 진행 중인 경기가 없습니다.")}</p>
          </div>
          <span class="pill live">${current.length}건</span>
        </div>
      </article>

      <article class="assignment-card">
        <h3>곧 시작</h3>
        <div class="list-stack">
          ${upcoming
            .map(
              (game) => `
                <div class="row-split session-row">
                  <div>
                    <strong>${escapeHtml(game.title)}</strong>
                    <p class="time">${escapeHtml(formatRange(game.start, game.end))}</p>
                  </div>
                  <span class="pill next">${escapeHtml(game.location)}</span>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function renderAssignments() {
  const assignedGames = getAssignedGames();
  const assignedBooths = getAssignedBooths();

  app.innerHTML = `
    <div class="section-title">
      <div>
        <h2>내 담당 항목</h2>
        <p>로그인한 운영진에게 실제로 배정된 경기와 부스를 보여줍니다.</p>
      </div>
    </div>

    <section class="dashboard-stack">
      <article class="assignment-card">
        <h3>담당 경기</h3>
        <div class="list-stack">
          ${
            assignedGames.length
              ? assignedGames.map(renderAssignedGameCard).join("")
              : `<div class="empty-state">배정된 경기가 없습니다.</div>`
          }
        </div>
      </article>

      <article class="assignment-card">
        <h3>담당 부스</h3>
        <div class="list-stack">
          ${
            assignedBooths.length
              ? assignedBooths.map(renderAssignedBoothCard).join("")
              : `<div class="empty-state">배정된 부스가 없습니다.</div>`
          }
        </div>
      </article>
    </section>
  `;
}

function renderAssignedGameCard(game) {
  const readiness = getGameReadiness(game.id);
  return `
    <article class="event-row ${readiness.ready ? "" : "blocked"}">
      <div class="row-head">
        <div>
          <h3>${escapeHtml(game.title)}</h3>
          <p class="time">${escapeHtml(formatRange(game.start, game.end))} · ${escapeHtml(game.location)}</p>
        </div>
        <span class="pill ${readiness.ready ? "live" : "alert"}">${escapeHtml(readiness.ready ? "입력 가능" : "시작 보류")}</span>
      </div>
      <p class="description">${escapeHtml(game.summary)}</p>
      ${
        readiness.ready
          ? ""
          : `<div class="todo-alert">${escapeHtml(readiness.reason)}<br />${escapeHtml(readiness.dependsOn.join(" / "))}</div>`
      }
      <div class="action-row">
        <button class="text-button" data-open-form="${escapeHtml(game.id)}" type="button">결과 입력</button>
      </div>
    </article>
  `;
}

function renderAssignedBoothCard(booth) {
  return `
    <article class="event-row">
      <div class="row-head">
        <div>
          <h3>${escapeHtml(booth.name)}</h3>
          <p class="time">${escapeHtml(booth.location)}</p>
        </div>
        <span class="pill ${statusClass(getBoothStatus(booth))}">${escapeHtml(getBoothStatus(booth))}</span>
      </div>
      <p class="description">${escapeHtml(booth.summary)}</p>
      <div class="action-row">
        <button class="text-button" data-open-form="${escapeHtml(booth.id)}" type="button">상태 입력</button>
      </div>
    </article>
  `;
}

function renderForms() {
  const waitingItems = getInputWaitingItems();
  const targetId = state.adminFormId ?? waitingItems[0]?.id;
  state.adminFormId = targetId ?? null;

  const game = getGame(targetId);
  const booth = getBooth(targetId);

  if (!targetId) {
    app.innerHTML = `<div class="empty-state">입력할 담당 항목이 없습니다.</div>`;
    return;
  }

  app.innerHTML = `
    <div class="section-title">
      <div>
        <h2>결과 입력</h2>
        <p>${escapeHtml(isSuperAdmin() ? "대표 운영진은 테스트를 위해 지원 종목 전체를 수정할 수 있습니다." : "배정된 항목만 바로 수정할 수 있도록 구성된 화면입니다.")}</p>
      </div>
    </div>

    <section class="filter-bar">
      ${waitingItems
        .map(
          (item) => `
            <button class="chip ${state.adminFormId === item.id ? "active" : ""}" data-open-form="${escapeHtml(item.id)}" type="button">
              ${escapeHtml(item.title)}
            </button>
          `,
        )
        .join("")}
    </section>

    ${game ? renderGameForm(game) : renderBoothForm(booth)}
  `;
}

function renderFormFeedback() {
  if (!state.formFeedback.text) return "";
  return `
    <div class="auth-status ${state.formFeedback.kind === "error" ? "error" : ""}">
      ${escapeHtml(state.formFeedback.text)}
    </div>
  `;
}

function inputValue(value) {
  return value === null || value === undefined ? "" : value;
}

function renderMatchSummary(result) {
  if (!result) {
    return `<div class="todo-alert">이 경기의 game_results 행을 아직 찾지 못했습니다.</div>`;
  }

  const scoreLabel =
    result.leftScore === null || result.rightScore === null ? "점수 미입력" : `${result.leftScore} : ${result.rightScore}`;
  const winnerLabel = result.winnerTeamId ? `승자: ${getTeamName(result.winnerTeamId)}` : "승자 미확정";

  return `
    <div class="match-summary">
      <div class="match-teams">
        <strong>${escapeHtml(getTeamName(result.leftTeamId))}</strong>
        <span>VS</span>
        <strong>${escapeHtml(getTeamName(result.rightTeamId))}</strong>
      </div>
      <p class="helper-text">${escapeHtml(scoreLabel)} · ${escapeHtml(winnerLabel)}</p>
    </div>
  `;
}

function renderScoreGameForm(game, result, readiness) {
  const saveBusy = state.auth.pending === "save";
  const tiebreakLabel = game.sport === "농구" ? "자유투" : "승부차기";

  return `
    <form class="form-card" data-result-form="score" data-game-id="${escapeHtml(game.id)}">
      <div class="row-head">
        <div>
          <h2>${escapeHtml(game.title)}</h2>
          <p class="time">${escapeHtml(formatRange(game.start, game.end))} · ${escapeHtml(game.location)}</p>
          <p class="description">${escapeHtml(game.summary)}</p>
        </div>
        <span class="pill ${readiness.ready ? "live" : "alert"}">${escapeHtml(readiness.ready ? "입력 가능" : "대진 미완성")}</span>
      </div>
      ${
        readiness.ready
          ? ""
          : `<div class="todo-alert">${escapeHtml(readiness.reason)}<br />${escapeHtml(readiness.dependsOn.join(" / "))}</div>`
      }
      ${renderMatchSummary(result)}
      ${renderFormFeedback()}
      <div class="form-grid two">
        <div class="field">
          <label>${escapeHtml(getTeamName(result?.leftTeamId))} 정규 점수</label>
          <input name="left_score" type="number" min="0" inputmode="numeric" value="${escapeHtml(inputValue(result?.leftScore))}" ${readiness.ready ? "required" : "disabled"} />
        </div>
        <div class="field">
          <label>${escapeHtml(getTeamName(result?.rightTeamId))} 정규 점수</label>
          <input name="right_score" type="number" min="0" inputmode="numeric" value="${escapeHtml(inputValue(result?.rightScore))}" ${readiness.ready ? "required" : "disabled"} />
        </div>
      </div>
      <div class="form-grid two">
        <div class="field">
          <label>${escapeHtml(getTeamName(result?.leftTeamId))} ${tiebreakLabel}</label>
          <input name="left_tiebreak_score" type="number" min="0" inputmode="numeric" value="${escapeHtml(inputValue(result?.leftTiebreakScore))}" ${readiness.ready ? "" : "disabled"} />
        </div>
        <div class="field">
          <label>${escapeHtml(getTeamName(result?.rightTeamId))} ${tiebreakLabel}</label>
          <input name="right_tiebreak_score" type="number" min="0" inputmode="numeric" value="${escapeHtml(inputValue(result?.rightTiebreakScore))}" ${readiness.ready ? "" : "disabled"} />
        </div>
      </div>
      <p class="helper-text">정규 점수가 동점이면 ${escapeHtml(tiebreakLabel)} 점수를 반드시 입력해야 합니다. 동점이 아니면 비워도 됩니다.</p>
      <div class="field">
        <label>메모</label>
        <textarea name="note" ${readiness.ready ? "" : "disabled"}>${escapeHtml(result?.note ?? "")}</textarea>
      </div>
      <div class="action-row">
        <button class="text-button" type="submit" ${readiness.ready && !saveBusy ? "" : "disabled"}>
          ${saveBusy ? "저장 중" : "결과 저장"}
        </button>
      </div>
    </form>
  `;
}

function renderRopeGameForm(game, result, readiness) {
  const saveBusy = state.auth.pending === "save";
  const existingSets = new Map(getResultSets(result?.id).map((set) => [set.setNumber, set]));
  const setRows = [1, 2, 3]
    .map((setNumber) => {
      const set = existingSets.get(setNumber);
      const winner = set?.leftScore === 1 ? "left" : set?.rightScore === 1 ? "right" : "";
      return `
        <div class="result-set-row">
          <div class="field">
            <label>${setNumber}세트 승자</label>
            <select name="set_${setNumber}_winner" ${readiness.ready ? "" : "disabled"}>
              <option value="" ${winner ? "" : "selected"}>미입력</option>
              <option value="left" ${winner === "left" ? "selected" : ""}>${escapeHtml(getTeamName(result?.leftTeamId))}</option>
              <option value="right" ${winner === "right" ? "selected" : ""}>${escapeHtml(getTeamName(result?.rightTeamId))}</option>
            </select>
          </div>
          <div class="field">
            <label>시간(초)</label>
            <input name="set_${setNumber}_duration" type="number" min="1" inputmode="numeric" value="${escapeHtml(inputValue(set?.durationSeconds))}" ${readiness.ready ? "" : "disabled"} />
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <form class="form-card" data-result-form="rope" data-game-id="${escapeHtml(game.id)}">
      <div class="row-head">
        <div>
          <h2>${escapeHtml(game.title)}</h2>
          <p class="time">${escapeHtml(formatRange(game.start, game.end))} · ${escapeHtml(game.location)}</p>
          <p class="description">${escapeHtml(game.summary)}</p>
        </div>
        <span class="pill ${readiness.ready ? "live" : "alert"}">${escapeHtml(readiness.ready ? "입력 가능" : "대진 미완성")}</span>
      </div>
      ${
        readiness.ready
          ? ""
          : `<div class="todo-alert">${escapeHtml(readiness.reason)}<br />${escapeHtml(readiness.dependsOn.join(" / "))}</div>`
      }
      ${renderMatchSummary(result)}
      ${renderFormFeedback()}
      <p class="helper-text">2:0이면 1, 2세트만 입력하고, 2:1이면 3세트까지 입력합니다. 시간은 초 단위로 넣어주세요.</p>
      ${setRows}
      <div class="field">
        <label>메모</label>
        <textarea name="note" ${readiness.ready ? "" : "disabled"}>${escapeHtml(result?.note ?? "")}</textarea>
      </div>
      <div class="action-row">
        <button class="text-button" type="submit" ${readiness.ready && !saveBusy ? "" : "disabled"}>
          ${saveBusy ? "저장 중" : "결과 저장"}
        </button>
      </div>
    </form>
  `;
}

function renderDodgeballGameForm(game, result, readiness) {
  const saveBusy = state.auth.pending === "save";
  const existingSets = new Map(getResultSets(result?.id).map((set) => [set.setNumber, set]));
  const setRows = [1, 2, 3]
    .map((setNumber) => {
      const set = existingSets.get(setNumber);
      return `
        <div class="dodgeball-set-row">
          <div class="result-team-label">${setNumber}세트</div>
          <div class="field">
            <label>${escapeHtml(getTeamName(result?.leftTeamId))} 생존자</label>
            <input name="set_${setNumber}_left_survivors" type="number" min="0" inputmode="numeric" value="${escapeHtml(inputValue(set?.leftScore))}" ${readiness.ready ? "" : "disabled"} />
          </div>
          <div class="field">
            <label>${escapeHtml(getTeamName(result?.rightTeamId))} 생존자</label>
            <input name="set_${setNumber}_right_survivors" type="number" min="0" inputmode="numeric" value="${escapeHtml(inputValue(set?.rightScore))}" ${readiness.ready ? "" : "disabled"} />
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <form class="form-card" data-result-form="dodgeball" data-game-id="${escapeHtml(game.id)}">
      <div class="row-head">
        <div>
          <h2>${escapeHtml(game.title)}</h2>
          <p class="time">${escapeHtml(formatRange(game.start, game.end))} · ${escapeHtml(game.location)}</p>
          <p class="description">${escapeHtml(game.summary)}</p>
        </div>
        <span class="pill ${readiness.ready ? "live" : "alert"}">${escapeHtml(readiness.ready ? "입력 가능" : "대진 미완성")}</span>
      </div>
      ${
        readiness.ready
          ? ""
          : `<div class="todo-alert">${escapeHtml(readiness.reason)}<br />${escapeHtml(readiness.dependsOn.join(" / "))}</div>`
      }
      ${renderMatchSummary(result)}
      ${renderFormFeedback()}
      <p class="helper-text">각 세트마다 양쪽 생존 학생 수를 입력합니다. 생존자가 더 많은 팀이 그 세트를 가져가고, 2세트를 먼저 이긴 팀이 경기 승자가 됩니다.</p>
      ${setRows}
      <div class="field">
        <label>메모</label>
        <textarea name="note" ${readiness.ready ? "" : "disabled"}>${escapeHtml(result?.note ?? "")}</textarea>
      </div>
      <div class="action-row">
        <button class="text-button" type="submit" ${readiness.ready && !saveBusy ? "" : "disabled"}>
          ${saveBusy ? "저장 중" : "결과 저장"}
        </button>
      </div>
    </form>
  `;
}

function renderRelayGameForm(game, readiness) {
  const saveBusy = state.auth.pending === "save";
  const rankingMap = new Map(getGameRankings(game.id).map((ranking) => [ranking.teamId, ranking]));
  const rows = state.teams
    .map((team) => {
      const ranking = rankingMap.get(team.id);
      return `
        <div class="relay-input-row">
          <div class="result-team-label">${escapeHtml(team.name)}</div>
          <div class="field">
            <label>등수</label>
            <input name="rank_${escapeHtml(team.id)}" type="number" min="1" max="${state.teams.length}" inputmode="numeric" value="${escapeHtml(inputValue(ranking?.rankOrder))}" required />
          </div>
          <div class="field">
            <label>기록</label>
            <input name="record_${escapeHtml(team.id)}" type="text" value="${escapeHtml(ranking?.recordValue ?? "")}" placeholder="예: 1:23.45" />
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <form class="form-card" data-result-form="relay" data-game-id="${escapeHtml(game.id)}">
      <div class="row-head">
        <div>
          <h2>${escapeHtml(game.title)}</h2>
          <p class="time">${escapeHtml(formatRange(game.start, game.end))} · ${escapeHtml(game.location)}</p>
          <p class="description">계주는 1대1 대진이 아니라 전체 학번 등수로 저장합니다.</p>
        </div>
        <span class="pill live">입력 가능</span>
      </div>
      ${renderFormFeedback()}
      <p class="helper-text">모든 학번의 등수를 한 번에 입력해야 합니다. 등수는 중복되면 저장되지 않습니다.</p>
      ${rows}
      <div class="field">
        <label>메모</label>
        <textarea name="note">${escapeHtml(getGameResult(game.id)?.note ?? "")}</textarea>
      </div>
      <div class="action-row">
        <button class="text-button" type="submit" ${readiness.ready && !saveBusy ? "" : "disabled"}>
          ${saveBusy ? "저장 중" : "결과 저장"}
        </button>
      </div>
    </form>
  `;
}

function renderUnsupportedGameForm(game) {
  return `
    <section class="form-card">
      <div class="row-head">
        <div>
          <h2>${escapeHtml(game.title)}</h2>
          <p class="time">${escapeHtml(formatRange(game.start, game.end))} · ${escapeHtml(game.location)}</p>
        </div>
        <span class="pill alert">준비 중</span>
      </div>
      <div class="todo-alert">이 종목은 아직 관리자 저장 RPC가 연결되지 않았습니다.</div>
    </section>
  `;
}

function renderGameForm(game) {
  const readiness = getGameReadiness(game.id);
  const result = getGameResult(game.id);

  if (game.sport === "농구" || game.sport === "풋살") return renderScoreGameForm(game, result, readiness);
  if (game.sport === "줄다리기") return renderRopeGameForm(game, result, readiness);
  if (String(game.sport ?? "").includes("피구")) return renderDodgeballGameForm(game, result, readiness);
  if (game.sport === "계주") return renderRelayGameForm(game, readiness);

  return renderUnsupportedGameForm(game);
}

function renderBoothForm(booth) {
  return `
    <section class="form-card">
      <div class="row-head">
        <div>
          <h2>${escapeHtml(booth.name)}</h2>
          <p class="time">${escapeHtml(booth.location)}</p>
          <p class="description">${escapeHtml(booth.summary)}</p>
        </div>
        <span class="pill ${statusClass(getBoothStatus(booth))}">${escapeHtml(getBoothStatus(booth))}</span>
      </div>
      <div class="field">
        <label>운영 메모</label>
        <textarea>${escapeHtml(booth.guide)}</textarea>
      </div>
      <div class="action-row">
        <button class="ghost-button" type="button">임시 저장</button>
        <button class="text-button" type="button">저장</button>
      </div>
    </section>
  `;
}

function renderOverview() {
  const blockedGames = state.games.filter((game) => game.kind === "game" && !getGameReadiness(game.id).ready);

  app.innerHTML = `
    <div class="section-title">
      <div>
        <h2>전체 현황</h2>
        <p>일반 운영진도 읽을 수 있는 공유 대시보드입니다.</p>
      </div>
    </div>

    <section class="dashboard-stack">
      <article class="assignment-card">
        <h3>대진 미완성 경기</h3>
        <div class="list-stack">
          ${
            blockedGames.length
              ? blockedGames
                  .map(
                    (game) => `
                      <div class="session-row">
                        <strong>${escapeHtml(game.title)}</strong>
                        <p class="description">${escapeHtml(getGameReadiness(game.id).reason)}</p>
                      </div>
                    `,
                  )
                  .join("")
              : `<div class="empty-state">현재 시작 보류 상태로 남은 경기가 없습니다.</div>`
          }
        </div>
      </article>

      <article class="assignment-card">
        <h3>부스 운영 현황</h3>
        <div class="list-stack">
          ${state.booths
            .map(
              (booth) => `
                <div class="row-split session-row">
                  <div>
                    <strong>${escapeHtml(booth.name)}</strong>
                    <p class="description">${escapeHtml(booth.location)}</p>
                  </div>
                  <span class="pill ${statusClass(getBoothStatus(booth))}">${escapeHtml(getBoothStatus(booth))}</span>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    </section>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function tabButtons() {
  return [...tabs.querySelectorAll(".tab-button")];
}

document.addEventListener("click", async (event) => {
  const tabButton = event.target.closest("[data-tab]");
  if (tabButton && isLoggedIn()) {
    state.tab = tabButton.dataset.tab;
    render();
    return;
  }

  const openFormButton = event.target.closest("[data-open-form]");
  if (openFormButton && isLoggedIn()) {
    state.tab = "forms";
    state.adminFormId = openFormButton.dataset.openForm;
    state.formFeedback = { kind: "", text: "" };
    render();
    return;
  }

  if (event.target.closest("[data-logout]")) {
    await handleLogout();
  }
});

document.addEventListener("submit", async (event) => {
  const loginForm = event.target.closest("[data-auth-form='login']");
  if (loginForm) {
    event.preventDefault();
    await handleLoginSubmit(new FormData(loginForm));
    return;
  }

  const resultForm = event.target.closest("[data-result-form]");
  if (resultForm && isLoggedIn()) {
    event.preventDefault();
    await handleResultSubmit(resultForm);
  }
});
