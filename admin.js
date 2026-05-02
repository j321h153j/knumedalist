const { demoTime, games: fallbackGames, booths: fallbackBooths } = window.EVENT_DATA;
const demoMinutes = toMinutes(demoTime);

const SUPABASE_URL = "https://texlipqnzkoylzeowvyg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_S63yxUuVD_ld3bV0-aACUw_sck9ipiF";

const app = document.querySelector("#admin-app");
const topbarNote = document.querySelector("#admin-topbar-note");
const topbarActions = document.querySelector("#admin-topbar-actions");
const tabs = document.querySelector("#admin-tabs");
const EXPANDED_GROUPS_STORAGE_KEY = "haengunje-admin-expanded-groups";

const state = {
  tab: "dashboard",
  adminFormId: null,
  expandedGroups: loadExpandedGroups(),
  expandedScoreboardTeams: new Set(),
  editingBoothScoreId: null,
  initialTabApplied: false,
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
  boothScores: [],
  boothSessions: [],
  scoreboard: null,
  formFeedback: {
    kind: "",
    text: "",
  },
};

boot();

const koreaClockFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTimeLabel(time) {
  const [hoursText, minutes] = time.split(":");
  const hours = Number(hoursText);
  const period = hours < 12 ? "\uC624\uC804" : "\uC624\uD6C4";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${period} ${displayHour}:${minutes}`;
}

function formatRange(start, end) {
  return `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`;
}

function timestampToClock(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const parts = koreaClockFormatter.formatToParts(date);
    const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
    return `${hour}:${minute}`;
  }

  const matched = String(value).match(/(\d{2}):(\d{2})/);
  return matched ? `${matched[1]}:${matched[2]}` : "";
}

function getStatus(start, end) {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (demoMinutes >= startMinutes && demoMinutes < endMinutes) return "\uC9C4\uD589 \uC911";
  if (demoMinutes >= endMinutes) return "\uC885\uB8CC";
  return "\uC608\uC815";
}

function getBoothStatus(booth) {
  if (booth?.status === "in_progress" || booth?.status === "open") return "\uC6B4\uC601 \uC911";
  if (booth?.status === "completed" || booth?.status === "closed") return "\uC885\uB8CC";
  if (booth?.status === "paused") return "\uC77C\uC2DC \uC911\uB2E8";
  return getStatus(booth.start, booth.end).replace("\uC9C4\uD589 \uC911", "\uC6B4\uC601 \uC911");
}

function statusClass(status) {
  if (status === "\uC9C4\uD589 \uC911" || status === "\uC6B4\uC601 \uC911" || status === "\uC785\uB825 \uC911") return "live";
  if (status === "\uC885\uB8CC" || status === "\uC644\uB8CC" || status === "\uC785\uB825 \uC644\uB8CC") return "done";
  if (status === "\uB300\uC9C4 \uBBF8\uC644\uC131" || status === "\uC77C\uC2DC \uC911\uB2E8") return "alert";
  if (status === "\uAD8C\uD55C \uC5C6\uC74C") return "alert";
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
  state.boothScores = [];
  state.boothSessions = [];
  state.scoreboard = null;
  state.formFeedback = { kind: "", text: "" };
  state.initialTabApplied = false;
}

function currentGames() {
  return state.games.filter(
    (game) => game.status === "in_progress" || getStatus(game.start, game.end) === "\uC9C4\uD589 \uC911",
  );
}

function upcomingGames(limit = 3) {
  return state.games
    .filter((game) => game.status !== "completed" && game.status !== "in_progress" && toMinutes(game.start) > demoMinutes)
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

function getBoothScores(boothId) {
  return state.boothScores
    .filter((score) => score.boothId === boothId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function getBoothSession(boothId) {
  return state.boothSessions.find((session) => session.boothId === boothId) ?? null;
}

function getTeamName(teamId) {
  return state.teams.find((team) => team.id === teamId)?.name ?? "\uBBF8\uC815";
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

function getEditableBooths() {
  return isSuperAdmin() ? state.booths : getAssignedBooths();
}

function canEditGame(game) {
  return isSuperAdmin() || getAssignedGames().some((assignedGame) => assignedGame.id === game?.id);
}

function canEditBooth(booth) {
  return isSuperAdmin() || getAssignedBooths().some((assignedBooth) => assignedBooth.id === booth?.id);
}

function isRpcGame(game) {
  const sport = String(game?.sport ?? "");
  return Boolean(
    game &&
      game.kind === "game" &&
      ([
        "\uB18D\uAD6C",
        "\uD48B\uC0B4",
        "\uC904\uB2E4\uB9AC\uAE30",
        "\uACC4\uC8FC",
      ].includes(sport) ||
        sport.includes("\uD53C\uAD6C")),
  );
}

function getEditableGames() {
  const source = isSuperAdmin() ? state.games : getAssignedGames();
  return source.filter(isRpcGame);
}

function isGameItem(item) {
  return Boolean(item && "sport" in item);
}

function isGameCompleted(game) {
  if (!game) return false;
  if (game.status === "completed") return true;
  if (game.sport === "\uACC4\uC8FC") return getGameRankings(game.id).length > 0;
  return Boolean(getGameResult(game.id)?.winnerTeamId);
}

function isBoothCompleted(booth) {
  if (!booth) return false;
  if (isScoringBooth(booth)) {
    const session = getBoothSession(booth.id);
    return booth.status === "completed" || booth.status === "closed" || session?.sessionStatus === "closed";
  }
  const session = getBoothSession(booth.id);
  return booth.status === "completed" || booth.status === "closed" || session?.sessionStatus === "closed";
}

function isItemCompleted(item) {
  return isGameItem(item) ? isGameCompleted(item) : isBoothCompleted(item);
}

function isItemStarted(item) {
  if (!item) return false;
  if (isItemCompleted(item)) return true;
  const status = String(item.status ?? "");
  if (["in_progress", "live", "started", "open"].includes(status)) return true;
  if (!isGameItem(item)) {
    const session = getBoothSession(item.id);
    if (["open", "in_progress", "started"].includes(String(session?.sessionStatus ?? ""))) return true;
  }
  return false;
}

function getItemStatusLabel(item, hasPermission = true) {
  if (!hasPermission) return "\uAD8C\uD55C \uC5C6\uC74C";
  if (!isGameItem(item) && isScoringBooth(item) && isItemStarted(item) && !isItemCompleted(item)) {
    return "\uC785\uB825 \uC911";
  }
  if (isItemCompleted(item)) return "\uC785\uB825 \uC644\uB8CC";
  if (isItemStarted(item)) return "\uC9C4\uD589 \uC911";
  return "\uC2DC\uC791 \uC804";
}

function getMatchLabel(game) {
  const result = getGameResult(game?.id);
  if (result?.leftTeamId && result?.rightTeamId) {
    return `${getTeamName(result.leftTeamId)} vs ${getTeamName(result.rightTeamId)}`;
  }
  if (game?.sport === "\uACC4\uC8FC") return "\uC804\uCCB4 \uD559\uBC88 \uC21C\uC704 \uC785\uB825";
  return game?.summary ?? "";
}

function getItemSubtitle(item) {
  if (isGameItem(item)) return `${getMatchLabel(item)} · ${formatRange(item.start, item.end)}`;
  return `${item.location} · ${getBoothStatus(item)}`;
}

function getItemActionLabel(item) {
  if (isItemCompleted(item)) return "\uC218\uC815";
  if (isItemStarted(item)) {
    if (isGameItem(item)) return "\uC791\uC131\uD558\uAE30";
    return isScoringBooth(item) ? "\uAE30\uB85D \uC785\uB825" : "\uC0C1\uD0DC \uC785\uB825";
  }
  return "\uC2DC\uC791";
}

function loadExpandedGroups() {
  try {
    const rawValue = window.localStorage.getItem(EXPANDED_GROUPS_STORAGE_KEY);
    if (!rawValue) return new Set();
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveExpandedGroups() {
  try {
    window.localStorage.setItem(EXPANDED_GROUPS_STORAGE_KEY, JSON.stringify([...state.expandedGroups]));
  } catch {
    // Ignore storage failures; the UI can still work without persistence.
  }
}

function getTaskItems({ includeAll = false } = {}) {
  const sourceItems = includeAll
    ? [...state.games.filter(isRpcGame), ...state.booths]
    : [...getEditableGames(), ...getEditableBooths()];

  return sourceItems.map((item) => {
    const isGame = "sport" in item;
    const hasPermission = isGame ? canEditGame(item) : canEditBooth(item);
    return {
      type: isGame ? "game" : "booth",
      id: item.id,
      item,
      group: isGame ? item.sport : "\uBD80\uC2A4",
      title: item.title ?? item.name,
      subtitle: getItemSubtitle(item),
      action: getItemActionLabel(item),
      status: getItemStatusLabel(item, hasPermission),
      completed: isItemCompleted(item),
      started: isItemStarted(item),
      hasPermission,
    };
  });
}

function getInputWaitingItems() {
  return getTaskItems();
}

function getGameReadiness(gameId) {
  const game = getGame(gameId);
  if (!game) {
    return {
      ready: false,
      reason: "\uACBD\uAE30 \uC815\uBCF4\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
      dependsOn: [],
    };
  }

  if (isRpcGame(game) && game.sport !== "\uACC4\uC8FC") {
    const result = getGameResult(gameId);
    if (!result?.leftTeamId || !result?.rightTeamId) {
      const qualifierNames = [`${game.sport} \uC608\uC120 1`, `${game.sport} \uC608\uC120 2`];
      const isDependentRound = game.title.includes("\uBD80\uACB0\uC2B9") || game.title.includes("\uACB0\uC2B9");
      return {
        ready: false,
        reason: isDependentRound
          ? "\uB300\uC9C4 \uD55C\uCABD \uD300\uC774 \uC544\uC9C1 \uD655\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. \uD544\uC694\uD55C \uC120\uD589 \uACBD\uAE30 \uACB0\uACFC\uB97C \uC800\uC7A5\uD558\uBA74 \uC790\uB3D9 \uBC30\uC815\uB429\uB2C8\uB2E4."
          : "\uC774 \uACBD\uAE30\uC758 left/right \uD300 \uC815\uBCF4\uAC00 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4.",
        dependsOn: isDependentRound ? qualifierNames : [],
      };
    }

    return { ready: true, reason: "", dependsOn: [] };
  }

  return { ready: true, reason: "", dependsOn: [] };
}

function getBracketPrefix(game) {
  return String(game?.title ?? "")
    .replace(/\s+\uC608\uC120\s*\d+.*$/, "")
    .replace(/\s+\uBD80\uACB0\uC2B9.*$/, "")
    .replace(/\s+\uACB0\uC2B9.*$/, "")
    .trim();
}

function getQualifierGroupKey(game) {
  const prefix = getBracketPrefix(game);
  const groupKeys = {
    "\uB18D\uAD6C": "basketball-qualifiers",
    "\uD48B\uC0B4": "futsal-qualifiers",
    "\uC904\uB2E4\uB9AC\uAE30": "rope-qualifiers",
    "\uC5EC\uC790 \uD53C\uAD6C": "women-dodgeball-qualifiers",
    "\uB0A8\uC790 \uD53C\uAD6C": "men-dodgeball-qualifiers",
  };
  return groupKeys[prefix] ?? null;
}

function getQualifierGames(game) {
  const prefix = getBracketPrefix(game);
  return [1, 2]
    .map((roundNumber) => state.games.find((candidate) => candidate.title === `${prefix} \uC608\uC120 ${roundNumber}`))
    .filter(Boolean);
}

function getQualifierWinnerOptions(game) {
  return getQualifierGames(game)
    .map((qualifier) => {
      const result = getGameResult(qualifier.id);
      return {
        game: qualifier,
        result,
        teamId: result?.winnerTeamId ?? null,
        teamName: result?.winnerTeamId ? getTeamName(result.winnerTeamId) : "",
        score:
          result?.leftScore === null || result?.rightScore === null || result?.leftScore === undefined
            ? ""
            : `${result.leftScore}:${result.rightScore}`,
      };
    })
    .filter((option) => option.teamId);
}

function canShowManualAdvancement(game) {
  if (!isSuperAdmin() || !game || !isGameItem(game)) return false;
  if (!(game.title.includes("\uBD80\uACB0\uC2B9") || game.title.includes("\uACB0\uC2B9"))) return false;
  if (!getQualifierGroupKey(game)) return false;

  const result = getGameResult(game.id);
  if (result?.leftTeamId && result?.rightTeamId) return false;

  const options = getQualifierWinnerOptions(game);
  return options.length === 2 && options[0].teamId !== options[1].teamId;
}

async function boot() {
  try {
    const client = initSupabaseClient();
    state.loading = true;
    render();

    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    await syncSession(data.session ?? null);
  } catch (error) {
    state.auth.error = error.message;
    state.loading = false;
    render();
  } finally {
    if (state.loading) {
      state.loading = false;
      render();
    }
  }
}

function initSupabaseClient() {
  if (state.auth.client) return state.auth.client;

  state.auth.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
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
      if (contextError) throw new Error(`get_admin_context \uC870\uD68C \uC2E4\uD328: ${contextError.message}`);

      if (!context?.ok) {
        clearAdminState();
        state.auth.error = "admins \uD14C\uC774\uBE14\uC5D0\uC11C \uD604\uC7AC \uB85C\uADF8\uC778 \uC0AC\uC6A9\uC790\uC640 \uC5F0\uACB0\uB41C \uC6B4\uC601\uC9C4 \uC815\uBCF4\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.";
        state.loading = false;
        render();
        return;
      }

      const admin = context.admin;
      const fallbackGameMap = new Map(fallbackGames.map((game) => [game.title, game]));
      const fallbackBoothMap = new Map(fallbackBooths.map((booth) => [booth.name, booth]));
      const previousAdminId = state.admin?.id ?? null;

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

      state.boothScores = (context.booth_scores ?? []).map((row) => ({
        id: row.id,
        boothId: row.booth_id,
        teamId: row.team_id,
        participantName: row.participant_name ?? "",
        participantStudentId: row.participant_student_id ?? "",
        scoreValue: row.score_value ?? "",
        scoreUnit: row.score_unit ?? "",
        attemptCount: row.attempt_count ?? "",
        note: row.note ?? "",
        createdAt: row.created_at ?? "",
      }));

      state.boothSessions = (context.booth_sessions ?? []).map((row) => ({
        id: row.id,
        boothId: row.booth_id,
        sessionLabel: row.session_label ?? "",
        sessionStatus: row.session_status ?? "",
        currentNote: row.current_note ?? "",
        updatedAt: row.updated_at ?? "",
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
      if (!silent && (!state.initialTabApplied || previousAdminId !== admin.id)) {
        state.tab = admin.role === "super_admin" ? "forms" : "assignments";
        state.initialTabApplied = true;
      }
      state.loading = false;
      if (!silent) render();
    } catch (error) {
      if (requestId !== state.auth.contextRequestId || state.auth.user?.id !== userId) return;
      if (silent) {
        console.warn("\uAD00\uB9AC\uC790 \uC815\uBCF4 \uC870\uC6A9\uD55C \uC7AC\uC870\uD68C \uC2E4\uD328:", error.message);
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
    state.auth.error = "Supabase \uD074\uB77C\uC774\uC5B8\uD2B8\uAC00 \uCD08\uAE30\uD654\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.";
    render();
    return;
  }

  if (state.auth.pending === "login") {
    state.auth.error = "\uC774\uBBF8 \uB85C\uADF8\uC778 \uC694\uCCAD\uC744 \uCC98\uB9AC \uC911\uC785\uB2C8\uB2E4. \uC7A0\uAE50\uB9CC \uAE30\uB2E4\uB824 \uC8FC\uC138\uC694.";
    render();
    return;
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    state.auth.error = "\uC774\uBA54\uC77C\uACFC \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.";
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
    if (required) throw new Error(`${label} \uAC12\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.`);
    return null;
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value)) throw new Error(`${label}\uC740 \uC815\uC218\uB85C \uC785\uB825\uD574 \uC8FC\uC138\uC694.`);
  if (value < min) throw new Error(`${label}\uC740 ${min} \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.`);
  return value;
}

function readTextField(form, name) {
  return String(form.elements[name]?.value ?? "").trim();
}

function parseNumericValue(raw, label) {
  const value = Number(String(raw ?? "").trim());
  if (!Number.isFinite(value)) throw new Error(`${label}\uC740 \uC22B\uC790\uB85C \uC785\uB825\uD574 \uC8FC\uC138\uC694.`);
  if (value < 0) throw new Error(`${label}\uC740 0 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.`);
  return value;
}

function buildScorePayload(form, game) {
  const leftScore = readIntegerField(form, "left_score", "\uC67C\uCABD \uC815\uADDC \uC810\uC218");
  const rightScore = readIntegerField(form, "right_score", "\uC624\uB978\uCABD \uC815\uADDC \uC810\uC218");
  const tiebreakType = game.sport === "\uB18D\uAD6C" ? "free_throw" : "penalty_shootout";
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
    note: null,
  };

  if (leftScore === rightScore) {
    payload.tiebreak = {
      type: tiebreakType,
      left: readIntegerField(form, "left_tiebreak_score", "\uC67C\uCABD \uB3D9\uC810 \uACB0\uC815 \uC810\uC218"),
      right: readIntegerField(form, "right_tiebreak_score", "\uC624\uB978\uCABD \uB3D9\uC810 \uACB0\uC815 \uC810\uC218"),
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
    if (!winner || !durationRaw) {
      throw new Error(`${setNumber}\uC138\uD2B8\uC758 \uC2B9\uC790\uC640 \uC2DC\uAC04\uC744 \uBAA8\uB450 \uC785\uB825\uD574 \uC8FC\uC138\uC694.`);
    }

    sets.push({
      set_number: setNumber,
      left_score: winner === "left" ? 1 : 0,
      right_score: winner === "right" ? 1 : 0,
      duration_seconds: readIntegerField(form, `set_${setNumber}_duration`, `${setNumber}\uC138\uD2B8 \uC2DC\uAC04`, { min: 1 }),
      note: "",
    });
  }

  const leftWins = sets.filter((set) => set.left_score === 1).length;
  const rightWins = sets.filter((set) => set.right_score === 1).length;

  if (sets.length < 2 || sets.length > 3) throw new Error("\uC904\uB2E4\uB9AC\uAE30\uB294 2\uC138\uD2B8 \uB610\uB294 3\uC138\uD2B8 \uACB0\uACFC\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
  if (!((leftWins === 2 && rightWins < 2) || (rightWins === 2 && leftWins < 2))) {
    throw new Error("\uC904\uB2E4\uB9AC\uAE30\uB294 \uD55C \uD300\uC774 \uC815\uD655\uD788 2\uC138\uD2B8\uB97C \uC774\uACA8\uC57C \uD569\uB2C8\uB2E4.");
  }

  return {
    rpcName: "submit_rope_game_result",
    payload: {
      game_id: game.id,
      sets,
      note: null,
    },
  };
}

function buildDodgeballPayload(form, game) {
  const sets = [];

  for (let setNumber = 1; setNumber <= 3; setNumber += 1) {
    const leftRaw = String(form.elements[`set_${setNumber}_left_survivors`]?.value ?? "").trim();
    const rightRaw = String(form.elements[`set_${setNumber}_right_survivors`]?.value ?? "").trim();

    if (!leftRaw && !rightRaw) continue;
    if (!leftRaw || !rightRaw) {
      throw new Error(`${setNumber}\uC138\uD2B8\uC758 \uC591\uCABD \uC0DD\uC874\uC790 \uC218\uB97C \uBAA8\uB450 \uC785\uB825\uD574 \uC8FC\uC138\uC694.`);
    }

    const leftSurvivors = readIntegerField(form, `set_${setNumber}_left_survivors`, `set ${setNumber} left survivors`, { min: 0 });
    const rightSurvivors = readIntegerField(form, `set_${setNumber}_right_survivors`, `set ${setNumber} right survivors`, { min: 0 });

    if (leftSurvivors === rightSurvivors) {
      throw new Error(`${setNumber}\uC138\uD2B8 \uC0DD\uC874\uC790 \uC218\uAC00 \uAC19\uC73C\uBA74 \uC2B9\uC790\uB97C \uD655\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
    }

    sets.push({
      set_number: setNumber,
      left_survivors: leftSurvivors,
      right_survivors: rightSurvivors,
      note: "",
    });
  }

  const leftWins = sets.filter((set) => set.left_survivors > set.right_survivors).length;
  const rightWins = sets.filter((set) => set.right_survivors > set.left_survivors).length;

  if (sets.length < 2 || sets.length > 3) throw new Error("\uD53C\uAD6C\uB294 2\uC138\uD2B8 \uB610\uB294 3\uC138\uD2B8 \uACB0\uACFC\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
  if (!((leftWins === 2 && rightWins < 2) || (rightWins === 2 && leftWins < 2))) {
    throw new Error("\uD53C\uAD6C\uB294 \uD55C \uD300\uC774 \uC815\uD655\uD788 2\uC138\uD2B8\uB97C \uC774\uACA8\uC57C \uD569\uB2C8\uB2E4.");
  }

  return {
    rpcName: "submit_dodgeball_game_result",
    payload: {
      game_id: game.id,
      sets,
      note: null,
    },
  };
}

function buildRelayPayload(form, game) {
  const rankings = state.teams.map((team) => ({
    team_id: team.id,
    rank_order: readIntegerField(form, `rank_${team.id}`, `${team.name} \uB4F1\uC218`, { min: 1 }),
    record_value: readTextField(form, `record_${team.id}`),
    note: "",
  }));

  const rankValues = rankings.map((ranking) => ranking.rank_order);
  if (new Set(rankValues).size !== rankValues.length) throw new Error("\uACC4\uC8FC \uB4F1\uC218\uB294 \uC911\uBCF5\uB420 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");

  return {
    rpcName: "submit_relay_result",
    payload: {
      game_id: game.id,
      rankings,
      note: null,
    },
  };
}

function isScoringBooth(booth) {
  const name = String(booth?.name ?? "");
  return (
    name.includes("\uC2E0\uBC1C") ||
    name.includes("\uC6E8\uC774\uD2B8") ||
    name.includes("\uB370\uB4DC")
  );
}

function isShoeBooth(booth) {
  return String(booth?.name ?? "").includes("\uC2E0\uBC1C");
}

function getBoothScoreUnit(booth) {
  const name = String(booth?.name ?? "");
  return name.includes("\uC6E8\uC774\uD2B8") || name.includes("\uB370\uB4DC") ? "kg" : "\uC810";
}

function getBoothScoreById(scoreId) {
  return state.boothScores.find((score) => score.id === scoreId) ?? null;
}

function buildBoothScoresPayload(form, booth) {
  const scoreUnit = form.dataset.scoreUnit || getBoothScoreUnit(booth);
  const teamId = readTextField(form, "team_id");
  const participantName = readTextField(form, "participant_name");
  const scoreRaw = readTextField(form, "score_value");

  if (!teamId) throw new Error("\uD559\uBC88 \uD300\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.");
  if (!scoreRaw) throw new Error("\uC810\uC218/\uAE30\uB85D\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.");

  const scoreValue = parseNumericValue(scoreRaw, "\uBD80\uC2A4 \uAE30\uB85D");
  if (isShoeBooth(booth) && scoreValue > 50) {
    throw new Error("\uC2E0\uBC1C \uB358\uC9C0\uAE30\uB294 \uCD5C\uB300 50\uC810\uAE4C\uC9C0 \uC785\uB825\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
  }

  return {
    rpcName: "submit_booth_scores",
    payload: {
      booth_id: booth.id,
      mode: "append",
      scores: [
        {
          score_id: state.editingBoothScoreId,
          team_id: teamId,
          participant_name: participantName || null,
          participant_student_id: null,
          score_value: scoreValue,
          score_unit: scoreUnit,
          attempt_count: null,
          note: null,
        },
      ],
      note: null,
    },
  };
}

function buildBoothSessionPayload(form, booth) {
  return {
    rpcName: "submit_booth_session",
    payload: {
      booth_id: booth.id,
      session_label: "current",
      session_status: readTextField(form, "session_status") || "open",
      current_note: null,
    },
  };
}

function buildBoothRequest(form) {
  const booth = getBooth(form.dataset.boothId);
  if (!booth) throw new Error("\uBD80\uC2A4 \uC815\uBCF4\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");

  if (form.dataset.boothForm === "scores") return buildBoothScoresPayload(form, booth);
  if (form.dataset.boothForm === "session") return buildBoothSessionPayload(form, booth);

  throw new Error("\uC544\uC9C1 \uC800\uC7A5\uC744 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uBD80\uC2A4 \uC785\uB825 \uD0C0\uC785\uC785\uB2C8\uB2E4.");
}

function buildResultRequest(form) {
  const game = getGame(form.dataset.gameId);
  if (!game) throw new Error("\uACBD\uAE30 \uC815\uBCF4\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");

  if (form.dataset.resultForm === "score") return buildScorePayload(form, game);
  if (form.dataset.resultForm === "rope") return buildRopePayload(form, game);
  if (form.dataset.resultForm === "dodgeball") return buildDodgeballPayload(form, game);
  if (form.dataset.resultForm === "relay") return buildRelayPayload(form, game);

  throw new Error("\uC544\uC9C1 \uC800\uC7A5\uC744 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uC785\uB825 \uD3FC\uC785\uB2C8\uB2E4.");
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

function setInlineFormFeedback(form, kind, text) {
  state.formFeedback = { kind, text };

  let feedback = form.querySelector("[data-inline-form-feedback]");
  if (!feedback) {
    feedback = document.createElement("div");
    feedback.dataset.inlineFormFeedback = "true";
    const anchor = form.querySelector(".action-row") ?? form.firstElementChild;
    if (anchor) anchor.before(feedback);
    else form.prepend(feedback);
  }

  feedback.className = `auth-status ${kind === "error" ? "error" : ""}`;
  feedback.textContent = text;
}

function setSubmitBusy(form, busy, busyText) {
  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton) return;

  if (!submitButton.dataset.idleText) {
    submitButton.dataset.idleText = submitButton.textContent.trim();
  }

  submitButton.disabled = busy;
  submitButton.textContent = busy ? busyText : submitButton.dataset.idleText;
}

async function handleResultSubmit(form) {
  if (!state.auth.client) return;
  if (state.auth.pending === "save") return;

  let request;
  try {
    request = buildResultRequest(form);
  } catch (error) {
    setInlineFormFeedback(form, "error", error.message);
    return;
  }

  state.auth.pending = "save";
  let shouldRender = false;
  setInlineFormFeedback(form, "info", "\uACB0\uACFC\uB97C \uC800\uC7A5\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.");
  setSubmitBusy(form, true, "\uC800\uC7A5 \uC911");

  try {
    const { data, error } = await withTimeout(
      state.auth.client.rpc(request.rpcName, { payload: request.payload }),
      20000,
      "\uC800\uC7A5 \uC694\uCCAD \uC751\uB2F5\uC774 20\uCD08\uB97C \uB118\uC5C8\uC2B5\uB2C8\uB2E4. DB\uC5D0 \uC800\uC7A5\uB418\uC5C8\uC744 \uC218 \uC788\uC73C\uB2C8 Supabase\uC5D0\uC11C \uACB0\uACFC\uB97C \uBA3C\uC800 \uD655\uC778\uD574 \uC8FC\uC138\uC694.",
    );
    if (error) throw error;

    const waiting = data?.advancement?.waiting
      ? " \uC544\uC9C1 \uB2E4\uC74C \uB300\uC9C4\uC740 \uB2E4\uB978 \uACBD\uAE30 \uACB0\uACFC\uB97C \uAE30\uB2E4\uB9AC\uB294 \uC0C1\uD0DC\uC785\uB2C8\uB2E4."
      : "";
    state.formFeedback = { kind: "success", text: `\uC800\uC7A5 \uC644\uB8CC.${waiting}` };
    await withTimeout(
      refreshAdminContext(),
      10000,
      "\uC800\uC7A5\uC740 \uC644\uB8CC\uB410\uC9C0\uB9CC \uCD5C\uC2E0 \uB370\uC774\uD130 \uC7AC\uC870\uD68C\uAC00 \uC9C0\uC5F0\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC0C8\uB85C\uACE0\uCE68\uD558\uBA74 \uCD5C\uC2E0 \uC0C1\uD0DC\uB97C \uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
    );
    state.adminFormId = null;
    shouldRender = true;
  } catch (error) {
    setInlineFormFeedback(form, "error", error.message);
  } finally {
    state.auth.pending = null;
    state.loading = false;
    if (shouldRender) render();
    else setSubmitBusy(form, false);
  }
}

async function handleBoothSubmit(form) {
  if (!state.auth.client) return;
  if (state.auth.pending === "save") return;

  let request;
  try {
    request = buildBoothRequest(form);
  } catch (error) {
    setInlineFormFeedback(form, "error", error.message);
    return;
  }

  state.auth.pending = "save";
  let shouldRender = false;
  setInlineFormFeedback(form, "info", "\uBD80\uC2A4 \uAE30\uB85D\uC744 \uC800\uC7A5\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.");
  setSubmitBusy(form, true, "\uC800\uC7A5 \uC911");

  try {
    const { error } = await withTimeout(
      state.auth.client.rpc(request.rpcName, { payload: request.payload }),
      20000,
      "\uBD80\uC2A4 \uC800\uC7A5 \uC694\uCCAD \uC751\uB2F5\uC774 20\uCD08\uB97C \uB118\uC5C8\uC2B5\uB2C8\uB2E4. Supabase\uC5D0\uC11C \uC800\uC7A5 \uC5EC\uBD80\uB97C \uBA3C\uC800 \uD655\uC778\uD574 \uC8FC\uC138\uC694.",
    );
    if (error) throw error;

    state.formFeedback = { kind: "success", text: "\uBD80\uC2A4 \uAE30\uB85D \uC800\uC7A5 \uC644\uB8CC. \uC810\uC218\uD45C\uB3C4 \uD568\uAED8 \uAC31\uC2E0\uB410\uC2B5\uB2C8\uB2E4." };
    state.editingBoothScoreId = null;
    await withTimeout(
      refreshAdminContext(),
      10000,
      "\uC800\uC7A5\uC740 \uC644\uB8CC\uB410\uC9C0\uB9CC \uCD5C\uC2E0 \uB370\uC774\uD130 \uC7AC\uC870\uD68C\uAC00 \uC9C0\uC5F0\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC0C8\uB85C\uACE0\uCE68\uD558\uBA74 \uCD5C\uC2E0 \uC0C1\uD0DC\uB97C \uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
    );
    shouldRender = true;
  } catch (error) {
    setInlineFormFeedback(form, "error", error.message);
  } finally {
    state.auth.pending = null;
    state.loading = false;
    if (shouldRender) render();
    else setSubmitBusy(form, false);
  }
}

async function handleStartItem(targetId, targetType) {
  if (!state.auth.client) return;
  if (state.auth.pending === "start") return;

  state.auth.pending = "start";
  state.formFeedback = { kind: "info", text: "\uC2DC\uC791 \uC0C1\uD0DC\uB97C \uC800\uC7A5\uD558\uB294 \uC911\uC785\uB2C8\uB2E4." };
  render();

  try {
    const { error } = await withTimeout(
      state.auth.client.rpc("start_event_item", {
        payload: {
          target_id: targetId,
          target_type: targetType,
        },
      }),
      15000,
      "\uC2DC\uC791 \uC694\uCCAD \uC751\uB2F5\uC774 15\uCD08\uB97C \uB118\uC5C8\uC2B5\uB2C8\uB2E4. Supabase\uC5D0\uC11C \uC0C1\uD0DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.",
    );
    if (error) throw error;

    state.formFeedback = { kind: "success", text: "\uC2DC\uC791 \uCC98\uB9AC \uC644\uB8CC. \uACB0\uACFC \uC785\uB825 \uD3FC\uC744 \uC5F4\uC5C8\uC2B5\uB2C8\uB2E4." };
    await refreshAdminContext();
  } catch (error) {
    state.formFeedback = { kind: "error", text: error.message };
  } finally {
    state.auth.pending = null;
    state.loading = false;
    render();
  }
}

async function handleManualAdvancementSubmit(form) {
  if (!state.auth.client) return;
  if (state.auth.pending === "override") return;

  const game = getGame(state.adminFormId);
  const options = game ? getQualifierWinnerOptions(game) : [];
  const groupKey = form.dataset.groupKey;
  const weakerTeamId = readTextField(form, "weaker_team_id");
  const betterTeamId = options.find((option) => option.teamId !== weakerTeamId)?.teamId ?? "";

  if (!groupKey || !betterTeamId || !weakerTeamId) {
    state.formFeedback = {
      kind: "error",
      text: "\uBD80\uACB0\uC2B9\uC73C\uB85C \uBCF4\uB0BC \uD300\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.",
    };
    render();
    return;
  }

  state.auth.pending = "override";
  state.formFeedback = {
    kind: "info",
    text: "\uC218\uB3D9 \uB300\uC9C4\uC744 \uBC30\uC815\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.",
  };
  render();

  try {
    const { error } = await withTimeout(
      state.auth.client.rpc("override_group_advancement", {
        p_group_key: groupKey,
        p_better_winner_team_id: betterTeamId,
        p_weaker_winner_team_id: weakerTeamId,
      }),
      15000,
      "\uC218\uB3D9 \uB300\uC9C4 \uBC30\uC815 \uC694\uCCAD\uC774 15\uCD08\uB97C \uB118\uC5C8\uC2B5\uB2C8\uB2E4. Supabase\uC5D0\uC11C \uB300\uC9C4 \uBC30\uC815\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.",
    );
    if (error) throw error;

    state.formFeedback = {
      kind: "success",
      text: "\uC218\uB3D9 \uB300\uC9C4 \uBC30\uC815 \uC644\uB8CC. \uBD80\uACB0\uC2B9/\uACB0\uC2B9 \uC2AC\uB86F\uC744 \uAC31\uC2E0\uD588\uC2B5\uB2C8\uB2E4.",
    };
    await refreshAdminContext();
  } catch (error) {
    state.formFeedback = { kind: "error", text: error.message };
  } finally {
    state.auth.pending = null;
    state.loading = false;
    render();
  }
}

function getMenuTabs() {
  if (!isLoggedIn()) return [];

  if (isSuperAdmin()) {
    return [
      { id: "dashboard", label: "\uB300\uC2DC\uBCF4\uB4DC", icon: "admin" },
      { id: "forms", label: "\uACB0\uACFC \uAD00\uB9AC", icon: "chart" },
      { id: "scoreboard", label: "\uC810\uC218\uD310", icon: "booth" },
    ];
  }

  return [
    { id: "dashboard", label: "\uB300\uC2DC\uBCF4\uB4DC", icon: "admin" },
    { id: "assignments", label: "\uB0B4 \uD560\uC77C", icon: "list" },
    { id: "scoreboard", label: "\uC810\uC218\uD310", icon: "booth" },
  ];
}

function normalizeVisibleTab() {
  if (!isLoggedIn()) return;

  if (isSuperAdmin() && state.tab === "assignments") {
    state.tab = "forms";
  }
}

function renderMenuTabs() {
  const menuTabs = getMenuTabs();
  tabs.innerHTML = menuTabs
    .map(
      (tab) => `
        <button class="tab-button" data-tab="${escapeHtml(tab.id)}" type="button">
          <span class="tab-icon ${escapeHtml(tab.icon)}" aria-hidden="true"></span>
          <span>${escapeHtml(tab.label)}</span>
        </button>
      `,
    )
    .join("");
}

function updateChrome() {
  tabs.classList.toggle("hidden", !isLoggedIn());
  app.classList.toggle("no-tabs", !isLoggedIn());

  if (!isLoggedIn()) {
    topbarNote.textContent = state.loading ? "\uB85C\uB529 \uC911" : "\uB85C\uADF8\uC778";
    topbarActions.className = "topbar-actions";
    topbarActions.innerHTML = "";
    tabs.innerHTML = "";
    return;
  }

  normalizeVisibleTab();
  renderMenuTabs();

  topbarNote.textContent = isSuperAdmin() ? "\uB300\uD45C" : "\uC6B4\uC601\uC9C4";
  topbarActions.className = "topbar-actions compact";
  topbarActions.innerHTML = `
    <div class="topbar-user">
      <strong>${escapeHtml(state.admin.name)}</strong>
      <span>${escapeHtml(state.admin.email)}</span>
    </div>
    <button class="ghost-button" type="button" data-logout ${state.auth.pending === "logout" ? "disabled" : ""}>
      ${state.auth.pending === "logout" ? "\uB85C\uADF8\uC544\uC6C3 \uC911" : "\uB85C\uADF8\uC544\uC6C3"}
    </button>
  `;
}

function render() {
  updateChrome();

  if (state.loading) {
    app.innerHTML = `
      <section class="loading-card">
        <span class="loading-dot" aria-hidden="true"></span>
        <strong>\uBD88\uB7EC\uC624\uB294 \uC911</strong>
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
  if (state.tab === "scoreboard") renderScoreboardPage();
}

function renderAuthGate() {
  const loginBusy = state.auth.pending === "login";

  app.innerHTML = `
    <section class="auth-stack">
      <form class="form-card" data-auth-form="login">
        <div class="section-title">
          <h2>\uB85C\uADF8\uC778</h2>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>\uC774\uBA54\uC77C</label>
            <input name="email" type="email" placeholder="lead@test.local" />
          </div>
          <div class="field">
            <label>\uBE44\uBC00\uBC88\uD638</label>
            <input name="password" type="password" placeholder="\uBE44\uBC00\uBC88\uD638 \uC785\uB825" />
          </div>
        </div>
        ${state.auth.error ? `<div class="auth-status error">${escapeHtml(state.auth.error)}</div>` : ""}
        <div class="action-row">
          <button class="text-button primary-submit-button" type="submit" ${loginBusy ? "disabled" : ""}>
            ${loginBusy ? "\uB85C\uADF8\uC778 \uC911" : "\uB85C\uADF8\uC778"}
          </button>
        </div>
      </form>
    </section>
  `;
}

function getScoreboardRankings() {
  return Array.isArray(state.scoreboard?.rankings) ? state.scoreboard.rankings : [];
}

function getScoreboardPointSources() {
  return Array.isArray(state.scoreboard?.point_sources) ? state.scoreboard.point_sources : [];
}

function normalizeScoreSourceTitle(source) {
  const rawTitle = String(source?.source_title ?? source?.reason ?? source?.source_type ?? "").trim();
  if (!rawTitle) return "\uC810\uC218";

  if (source?.source_type === "booth") return rawTitle;

  return rawTitle
    .replace(/\s+\uC608\uC120\s*\d+.*$/, "")
    .replace(/\s+\uBD80\uACB0\uC2B9.*$/, "")
    .replace(/\s+\uACB0\uC2B9.*$/, "")
    .replace(/\s+\d+\uC704.*$/, "")
    .replace(/\s+\uCC38\uAC00.*$/, "")
    .trim() || rawTitle;
}

function formatScoreSourceDetail(source, title) {
  const reason = String(source?.reason ?? "").trim();
  if (!reason) return "";

  const rawTitle = String(source?.source_title ?? "").trim();
  let detail = reason;
  [title, rawTitle].filter(Boolean).forEach((prefix) => {
    if (detail.startsWith(prefix)) detail = detail.slice(prefix.length).trim();
  });

  return detail || reason;
}

function renderScoreboardCard({ showSources = false } = {}) {
  const rankings = getScoreboardRankings();

  return `
    <article class="assignment-card">
      <div class="row-head">
        <div>
          <h3>\uC885\uD569 \uC810\uC218\uD45C</h3>
        </div>
        <span class="pill live">${rankings.length}\uD300</span>
      </div>
      <div class="list-stack">
        ${
          rankings.length
            ? rankings
                .map(
                  (row) => `
                    <div class="scoreboard-team-card">
                      <button class="ranking-row ranking-button" data-toggle-scoreboard-team="${escapeHtml(row.team_id)}" type="button">
                        <span class="rank">${escapeHtml(row.rank_order)}</span>
                        <div>
                          <strong>${escapeHtml(row.team_name)}</strong>
                        </div>
                        <span class="score">${escapeHtml(row.total_points)}\uC810</span>
                      </button>
                      ${
                        state.expandedScoreboardTeams.has(row.team_id)
                          ? `
                            <div class="score-source-list">
                              ${(row.sources ?? [])
                                .map(
                                  (source) => {
                                    const sourceTitle = normalizeScoreSourceTitle(source);
                                    const sourceDetail = formatScoreSourceDetail(source, sourceTitle);
                                    return `
                                      <div class="row-split score-source-row">
                                        <div class="score-source-main">
                                          <strong>${escapeHtml(sourceTitle)}</strong>
                                          ${sourceDetail ? `<p class="description">${escapeHtml(sourceDetail)}</p>` : ""}
                                        </div>
                                        <span class="score source-score">${escapeHtml(source.points)}\uC810</span>
                                      </div>
                                    `;
                                  },
                                )
                                .join("")}
                            </div>
                          `
                          : ""
                      }
                    </div>
                  `,
                )
                .join("")
            : `<div class="empty-state">\uC544\uC9C1 \uC810\uC218 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div>`
        }
      </div>
    </article>
  `;
}

function renderDashboard() {
  const current = currentGames();
  const upcoming = upcomingGames();
  const incompleteCount = getTaskItems().filter((item) => !item.completed).length;

  app.innerHTML = `
    <section class="dashboard-stack">
      <div class="two-column">
        <article class="stat-card">
          <p class="stat-label">\uB0A8\uC740 \uC785\uB825</p>
          <p class="stat-value">${incompleteCount}</p>
        </article>
        <article class="stat-card">
          <p class="stat-label">\uC9C4\uD589 \uC911</p>
          <p class="stat-value">${current.length}</p>
        </article>
      </div>

      <article class="assignment-card">
        <div class="row-head">
          <div>
            <h3>\uD604\uC7AC \uC9C4\uD589</h3>
            <p class="description">${escapeHtml(current.length ? current.map((item) => item.title).join(" / ") : "\uD604\uC7AC \uC9C4\uD589 \uC911\uC778 \uACBD\uAE30\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.")}</p>
          </div>
          <span class="pill live">${current.length}\uAC74</span>
        </div>
      </article>

      <article class="assignment-card">
        <h3>\uB2E4\uC74C \uC77C\uC815</h3>
        <div class="list-stack">
          ${
            upcoming.length
              ? upcoming
                  .map(
                    (game) => `
                      <div class="row-split session-row">
                        <div>
                          <strong>${escapeHtml(game.title)}</strong>
                          <p class="time">${escapeHtml(getMatchLabel(game))} · ${escapeHtml(formatRange(game.start, game.end))}</p>
                        </div>
                        <span class="pill next">${escapeHtml(game.location)}</span>
                      </div>
                    `,
                  )
                  .join("")
              : `<div class="empty-state">\uB0A8\uC740 \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>`
          }
        </div>
      </article>
    </section>
  `;
}

function renderAssignments() {
  const tasks = getTaskItems();
  const pendingTasks = tasks.filter((item) => !item.completed);
  const completedTasks = tasks.filter((item) => item.completed);

  app.innerHTML = `
    <div class="section-title">
      <div>
        <h2>\uB0B4 \uD560 \uC77C</h2>
      </div>
    </div>

    <section class="dashboard-stack">
      <article class="assignment-card">
        <h3>\uC785\uB825 \uD544\uC694</h3>
        <div class="list-stack">
          ${
            pendingTasks.length
              ? pendingTasks.map(renderTaskCard).join("")
              : `<div class="empty-state">\uC9C0\uAE08 \uC785\uB825\uD574\uC57C \uD560 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>`
          }
        </div>
      </article>

      <article class="assignment-card">
        <h3>\uC785\uB825 \uC644\uB8CC</h3>
        <div class="list-stack">
          ${
            completedTasks.length
              ? completedTasks.map(renderTaskCard).join("")
              : `<div class="empty-state">\uC544\uC9C1 \uC785\uB825 \uC644\uB8CC\uB41C \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>`
          }
        </div>
      </article>
    </section>
  `;
}

function renderTaskCard(task) {
  const item = task.item;
  const buttonLabel = task.completed ? "\uC218\uC815" : task.started ? "\uC791\uC131\uD558\uAE30" : "\uC2DC\uC791";
  return `
    <article class="event-row ${task.hasPermission ? "" : "blocked"}">
      <div class="row-head">
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <p class="time">${escapeHtml(task.subtitle)}</p>
        </div>
        <span class="pill ${statusClass(task.status)}">${escapeHtml(task.status)}</span>
      </div>
      <div class="action-row">
        <button class="text-button" data-open-form="${escapeHtml(task.id)}" type="button" ${task.hasPermission ? "" : "disabled"}>
          ${escapeHtml(buttonLabel)}
        </button>
      </div>
    </article>
  `;
}

function renderAssignedGameCard(game) {
  const readiness = getGameReadiness(game.id);
  const statusLabel = readiness.ready ? "\uC785\uB825 \uAC00\uB2A5" : "\uC2DC\uC791 \uBCF4\uB958";
  return `
    <article class="event-row ${readiness.ready ? "" : "blocked"}">
      <div class="row-head">
        <div>
          <h3>${escapeHtml(game.title)}</h3>
          <p class="time">${escapeHtml(formatRange(game.start, game.end))} · ${escapeHtml(game.location)}</p>
        </div>
        <span class="pill ${readiness.ready ? "live" : "alert"}">${escapeHtml(statusLabel)}</span>
      </div>
      ${
        readiness.ready
          ? ""
          : `<div class="todo-alert">${escapeHtml(readiness.reason)}<br />${escapeHtml(readiness.dependsOn.join(" / "))}</div>`
      }
      <div class="action-row">
        <button class="text-button" data-open-form="${escapeHtml(game.id)}" type="button">\uACB0\uACFC \uC785\uB825</button>
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
      <div class="action-row">
        <button class="text-button" data-open-form="${escapeHtml(booth.id)}" type="button">${isScoringBooth(booth) ? "\uAE30\uB85D \uC785\uB825" : "\uC0C1\uD0DC \uC785\uB825"}</button>
      </div>
    </article>
  `;
}

function getResultSummary(item) {
  if (isGameItem(item)) {
    if (item.sport === "\uACC4\uC8FC") {
      const rankings = getGameRankings(item.id);
      const winner = rankings.find((ranking) => ranking.rankOrder === 1);
      return winner ? `1\uC704 ${getTeamName(winner.teamId)}` : "\uACB0\uACFC \uBBF8\uC785\uB825";
    }

    const result = getGameResult(item.id);
    if (!result?.winnerTeamId) return getMatchLabel(item);
    const score =
      result.leftScore === null || result.rightScore === null ? "" : ` · ${result.leftScore}:${result.rightScore}`;
    const tiebreak =
      result.tiebreakType && result.tiebreakType !== "none" && result.leftTiebreakScore !== null && result.rightTiebreakScore !== null
        ? ` · ${getTiebreakLabel(result.tiebreakType)} ${result.leftTiebreakScore}:${result.rightTiebreakScore}`
        : "";
    return `${getTeamName(result.winnerTeamId)} \uC2B9${score}${tiebreak}`;
  }

  if (isScoringBooth(item)) return `${getBoothScores(item.id).length}\uAC1C \uAE30\uB85D \uC800\uC7A5`;
  return getBoothSession(item.id)?.sessionStatus === "closed" ? "\uC6B4\uC601 \uC885\uB8CC" : "\uC0C1\uD0DC \uC800\uC7A5";
}

function getTiebreakLabel(type) {
  if (type === "free_throw") return "\uC790\uC720\uD22C";
  if (type === "penalty_shootout") return "\uC2B9\uBD80\uCC28\uAE30";
  return "\uB3D9\uC810 \uACB0\uC815";
}

function getChallengeGroups() {
  const groups = new Map();
  getTaskItems({ includeAll: true }).forEach((task) => {
    const groupName = task.group || "\uAE30\uD0C0";
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName).push(task);
  });
  return [...groups.entries()].map(([name, items]) => ({ name, items }));
}

function renderChallengeListCard(task) {
  const buttonLabel = task.hasPermission
    ? task.completed
      ? "\uC218\uC815"
      : task.started
        ? "\uC791\uC131\uD558\uAE30"
        : "\uC2DC\uC791"
    : "\uAD8C\uD55C \uC5C6\uC74C";
  return `
    <article class="event-row ${task.hasPermission ? "" : "blocked"}">
      <div class="row-head">
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <p class="time">${escapeHtml(task.subtitle)}</p>
          <p class="description">${escapeHtml(task.completed ? getResultSummary(task.item) : getMatchLabel(task.item) || task.subtitle)}</p>
        </div>
        <span class="pill ${statusClass(task.status)}">${escapeHtml(task.status)}</span>
      </div>
      <div class="action-row">
        <button class="text-button" data-open-form="${escapeHtml(task.id)}" type="button" ${task.hasPermission ? "" : "disabled"}>
          ${escapeHtml(buttonLabel)}
        </button>
      </div>
    </article>
  `;
}

function renderChallengeGroup(group) {
  const isOpen = state.expandedGroups.has(group.name);
  const pendingCount = group.items.filter((item) => !item.completed).length;
  const statusLabel = pendingCount ? `${pendingCount}\uAC1C \uC785\uB825 \uD544\uC694` : "\uC785\uB825 \uC644\uB8CC";
  const arrowLabel = isOpen ? "\u25B2" : "\u25BC";
  return `
    <article class="assignment-card">
      <button class="accordion-head" data-toggle-group="${escapeHtml(group.name)}" type="button">
        <span>${escapeHtml(group.name)}</span>
        <span>${escapeHtml(statusLabel)} ${arrowLabel}</span>
      </button>
      ${
        isOpen
          ? `<div class="list-stack">${group.items.map(renderChallengeListCard).join("")}</div>`
          : ""
      }
    </article>
  `;
}

function renderStartPanel(item, type) {
  const isGame = type === "game";
  const readiness = isGame ? getGameReadiness(item.id) : { ready: true, reason: "", dependsOn: [] };
  const saveBusy = state.auth.pending === "start";
  const manualOverride = isGame && canShowManualAdvancement(item) ? renderManualAdvancementPanel(item) : "";
  return `
    <section class="form-card">
      <div class="row-head">
        <div>
          <h2>${escapeHtml(item.title ?? item.name)}</h2>
          <p class="time">${escapeHtml(getItemSubtitle(item))}</p>
        </div>
        <span class="pill next">\uC2DC\uC791 \uC804</span>
      </div>
      ${
        readiness.ready
          ? ""
          : `<div class="todo-alert">${escapeHtml(readiness.reason)}<br />${escapeHtml(readiness.dependsOn.join(" / "))}</div>`
      }
      <div class="action-row">
        <button class="text-button" data-start-item="${escapeHtml(item.id)}" data-start-type="${escapeHtml(type)}" type="button" ${readiness.ready && !saveBusy ? "" : "disabled"}>
          ${saveBusy ? "\uC2DC\uC791 \uCC98\uB9AC \uC911" : "\uC2DC\uC791"}
        </button>
      </div>
      ${manualOverride}
    </section>
  `;
}

function renderManualAdvancementPanel(game) {
  const options = getQualifierWinnerOptions(game);
  const groupKey = getQualifierGroupKey(game);
  const busy = state.auth.pending === "override";

  if (!groupKey || options.length !== 2) return "";

  return `
    <form class="info-panel" data-manual-advancement-form data-group-key="${escapeHtml(groupKey)}">
      <h4>\uC218\uB3D9 \uB300\uC9C4 \uACB0\uC815</h4>
      ${renderFormFeedback()}
      <div class="form-grid">
        <div class="field">
          <label>\uBD80\uACB0\uC2B9 \uC9C4\uCD9C \uD300</label>
          <select name="weaker_team_id" required>
            <option value="">\uC120\uD0DD</option>
            ${options
              .map(
                (option) => `
                  <option value="${escapeHtml(option.teamId)}">
                    ${escapeHtml(option.teamName)} · ${escapeHtml(option.game.title)} ${escapeHtml(option.score)}
                  </option>
                `,
              )
              .join("")}
          </select>
        </div>
      </div>
      <div class="action-row">
        <button class="text-button" type="submit" ${busy ? "disabled" : ""}>
          ${busy ? "\uBC30\uC815 \uC911" : "\uBC30\uC815"}
        </button>
      </div>
    </form>
  `;
}

function renderChallengeDetail(targetId) {
  const game = getGame(targetId);
  const booth = getBooth(targetId);
  const item = game ?? booth;
  const type = game ? "game" : "booth";
  const hasPermission = game ? canEditGame(game) : canEditBooth(booth);

  if (!item) return `<div class="empty-state">\uC785\uB825 \uD56D\uBAA9\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.</div>`;

  if (!hasPermission) {
    return `
      <section class="form-card">
        <h2>${escapeHtml(item.title ?? item.name)}</h2>
        <div class="todo-alert">\uC774 \uD56D\uBAA9\uC744 \uC218\uC815\uD560 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>
      </section>
    `;
  }

  if (!isItemStarted(item) && !isItemCompleted(item)) {
    return renderStartPanel(item, type);
  }

  return game ? renderGameForm(game) : renderBoothForm(booth);
}

function renderForms() {
  const groups = getChallengeGroups();

  app.innerHTML = `
    <div class="section-title">
      <div>
        <h2>\uACB0\uACFC \uAD00\uB9AC</h2>
      </div>
      ${
        state.adminFormId
          ? `<button class="ghost-button" data-back-to-form-list type="button">\uBAA9\uB85D</button>`
          : ""
      }
    </div>

    ${
      state.adminFormId
        ? renderChallengeDetail(state.adminFormId)
        : `<section class="dashboard-stack">${groups.map(renderChallengeGroup).join("")}</section>`
    }
  `;
}

function renderFormFeedback() {
  if (!state.formFeedback.text) return "";
  return `
    <div class="auth-status ${state.formFeedback.kind === "error" ? "error" : ""}" data-inline-form-feedback>
      ${escapeHtml(state.formFeedback.text)}
    </div>
  `;
}

function inputValue(value) {
  return value === null || value === undefined ? "" : value;
}

function areRegularScoresTied(form) {
  const leftRaw = String(form.elements.left_score?.value ?? "").trim();
  const rightRaw = String(form.elements.right_score?.value ?? "").trim();
  if (!leftRaw || !rightRaw) return false;

  const left = Number(leftRaw);
  const right = Number(rightRaw);
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
}

function syncTiebreakVisibility(form) {
  const panel = form?.querySelector("[data-tiebreak-panel]");
  if (!panel) return;

  const shouldShow = areRegularScoresTied(form);
  const canEdit = form.dataset.ready === "true";
  panel.hidden = !shouldShow;

  panel.querySelectorAll("input").forEach((input) => {
    input.disabled = !shouldShow || !canEdit;
    input.required = shouldShow && canEdit;
    if (!shouldShow) input.value = "";
  });
}

function renderMatchSummary(result) {
  if (!result) {
    return `<div class="todo-alert">\uC774 \uACBD\uAE30\uC758 game_results \uD589\uC744 \uC544\uC9C1 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.</div>`;
  }

  const scoreLabel =
    result.leftScore === null || result.rightScore === null
      ? "\uC810\uC218 \uBBF8\uC785\uB825"
      : `${result.leftScore} : ${result.rightScore}`;
  const winnerLabel = result.winnerTeamId ? `\uC2B9\uC790: ${getTeamName(result.winnerTeamId)}` : "\uC2B9\uC790 \uBBF8\uD655\uC815";
  const tiebreakLabel =
    result.tiebreakType && result.tiebreakType !== "none" && result.leftTiebreakScore !== null && result.rightTiebreakScore !== null
      ? ` · ${getTiebreakLabel(result.tiebreakType)} ${result.leftTiebreakScore} : ${result.rightTiebreakScore}`
      : "";

  return `
    <div class="match-summary">
      <div class="match-teams">
        <strong>${escapeHtml(getTeamName(result.leftTeamId))}</strong>
        <span>VS</span>
        <strong>${escapeHtml(getTeamName(result.rightTeamId))}</strong>
      </div>
      <p class="helper-text">${escapeHtml(scoreLabel)} · ${escapeHtml(winnerLabel)}${escapeHtml(tiebreakLabel)}</p>
    </div>
  `;
}

function renderScoreGameForm(game, result, readiness) {
  const saveBusy = state.auth.pending === "save";
  const tiebreakLabel = game.sport === "\uB18D\uAD6C" ? "\uC790\uC720\uD22C" : "\uC2B9\uBD80\uCC28\uAE30";
  const readinessLabel = readiness.ready ? "\uC785\uB825 \uAC00\uB2A5" : "\uB300\uC9C4 \uBBF8\uC644\uC131";
  const showTiebreak =
    result?.leftScore !== null &&
    result?.leftScore !== undefined &&
    result?.rightScore !== null &&
    result?.rightScore !== undefined &&
    result.leftScore === result.rightScore;

  return `
    <form class="form-card" data-result-form="score" data-score-game-form data-ready="${readiness.ready ? "true" : "false"}" data-game-id="${escapeHtml(game.id)}">
      <div class="row-head">
        <div>
          <h2>${escapeHtml(game.title)}</h2>
          <p class="time">${escapeHtml(formatRange(game.start, game.end))} · ${escapeHtml(game.location)}</p>
        </div>
        <span class="pill ${readiness.ready ? "live" : "alert"}">${escapeHtml(readinessLabel)}</span>
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
          <label>${escapeHtml(getTeamName(result?.leftTeamId))} \uC815\uADDC \uC810\uC218</label>
          <input name="left_score" data-score-input type="number" min="0" inputmode="numeric" value="${escapeHtml(inputValue(result?.leftScore))}" ${readiness.ready ? "required" : "disabled"} />
        </div>
        <div class="field">
          <label>${escapeHtml(getTeamName(result?.rightTeamId))} \uC815\uADDC \uC810\uC218</label>
          <input name="right_score" data-score-input type="number" min="0" inputmode="numeric" value="${escapeHtml(inputValue(result?.rightScore))}" ${readiness.ready ? "required" : "disabled"} />
        </div>
      </div>
      <div class="form-grid two" data-tiebreak-panel ${showTiebreak ? "" : "hidden"}>
        <div class="field">
          <label>${escapeHtml(getTeamName(result?.leftTeamId))} ${tiebreakLabel}</label>
          <input name="left_tiebreak_score" type="number" min="0" inputmode="numeric" value="${escapeHtml(inputValue(result?.leftTiebreakScore))}" ${readiness.ready && showTiebreak ? "required" : "disabled"} />
        </div>
        <div class="field">
          <label>${escapeHtml(getTeamName(result?.rightTeamId))} ${tiebreakLabel}</label>
          <input name="right_tiebreak_score" type="number" min="0" inputmode="numeric" value="${escapeHtml(inputValue(result?.rightTiebreakScore))}" ${readiness.ready && showTiebreak ? "required" : "disabled"} />
        </div>
      </div>
      <div class="action-row">
        <button class="text-button primary-submit-button" type="submit" ${readiness.ready && !saveBusy ? "" : "disabled"}>
          ${saveBusy ? "\uC800\uC7A5 \uC911" : "\uACB0\uACFC \uC800\uC7A5"}
        </button>
      </div>
    </form>
  `;
}

function renderRopeGameForm(game, result, readiness) {
  const saveBusy = state.auth.pending === "save";
  const readinessLabel = readiness.ready ? "\uC785\uB825 \uAC00\uB2A5" : "\uB300\uC9C4 \uBBF8\uC644\uC131";
  const existingSets = new Map(getResultSets(result?.id).map((set) => [set.setNumber, set]));
  const setRows = [1, 2, 3]
    .map((setNumber) => {
      const set = existingSets.get(setNumber);
      const winner = set?.leftScore === 1 ? "left" : set?.rightScore === 1 ? "right" : "";
      return `
        <div class="result-set-row">
          <div class="field">
            <label>${setNumber}\uC138\uD2B8 \uC2B9\uC790</label>
            <select name="set_${setNumber}_winner" ${readiness.ready ? "" : "disabled"}>
              <option value="" ${winner ? "" : "selected"}>\uBBF8\uC785\uB825</option>
              <option value="left" ${winner === "left" ? "selected" : ""}>${escapeHtml(getTeamName(result?.leftTeamId))}</option>
              <option value="right" ${winner === "right" ? "selected" : ""}>${escapeHtml(getTeamName(result?.rightTeamId))}</option>
            </select>
          </div>
          <div class="field">
            <label>\uC2DC\uAC04(\uCD08)</label>
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
        </div>
        <span class="pill ${readiness.ready ? "live" : "alert"}">${escapeHtml(readinessLabel)}</span>
      </div>
      ${
        readiness.ready
          ? ""
          : `<div class="todo-alert">${escapeHtml(readiness.reason)}<br />${escapeHtml(readiness.dependsOn.join(" / "))}</div>`
      }
      ${renderMatchSummary(result)}
      ${renderFormFeedback()}
      ${setRows}
      <div class="action-row">
        <button class="text-button primary-submit-button" type="submit" ${readiness.ready && !saveBusy ? "" : "disabled"}>
          ${saveBusy ? "\uC800\uC7A5 \uC911" : "\uACB0\uACFC \uC800\uC7A5"}
        </button>
      </div>
    </form>
  `;
}

function renderDodgeballGameForm(game, result, readiness) {
  const saveBusy = state.auth.pending === "save";
  const readinessLabel = readiness.ready ? "\uC785\uB825 \uAC00\uB2A5" : "\uB300\uC9C4 \uBBF8\uC644\uC131";
  const existingSets = new Map(getResultSets(result?.id).map((set) => [set.setNumber, set]));
  const setRows = [1, 2, 3]
    .map((setNumber) => {
      const set = existingSets.get(setNumber);
      return `
        <div class="dodgeball-set-row">
          <div class="result-team-label">${setNumber}\uC138\uD2B8</div>
          <div class="field">
            <label>${escapeHtml(getTeamName(result?.leftTeamId))} \uC0DD\uC874\uC790</label>
            <input name="set_${setNumber}_left_survivors" type="number" min="0" inputmode="numeric" value="${escapeHtml(inputValue(set?.leftScore))}" ${readiness.ready ? "" : "disabled"} />
          </div>
          <div class="field">
            <label>${escapeHtml(getTeamName(result?.rightTeamId))} \uC0DD\uC874\uC790</label>
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
        </div>
        <span class="pill ${readiness.ready ? "live" : "alert"}">${escapeHtml(readinessLabel)}</span>
      </div>
      ${
        readiness.ready
          ? ""
          : `<div class="todo-alert">${escapeHtml(readiness.reason)}<br />${escapeHtml(readiness.dependsOn.join(" / "))}</div>`
      }
      ${renderMatchSummary(result)}
      ${renderFormFeedback()}
      ${setRows}
      <div class="action-row">
        <button class="text-button primary-submit-button" type="submit" ${readiness.ready && !saveBusy ? "" : "disabled"}>
          ${saveBusy ? "\uC800\uC7A5 \uC911" : "\uACB0\uACFC \uC800\uC7A5"}
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
            <label>\uB4F1\uC218</label>
            <input name="rank_${escapeHtml(team.id)}" type="number" min="1" max="${state.teams.length}" inputmode="numeric" value="${escapeHtml(inputValue(ranking?.rankOrder))}" required />
          </div>
          <div class="field">
            <label>\uAE30\uB85D</label>
            <input name="record_${escapeHtml(team.id)}" type="text" value="${escapeHtml(ranking?.recordValue ?? "")}" placeholder="\uC608: 1:23.45" />
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
        </div>
        <span class="pill live">\uC785\uB825 \uAC00\uB2A5</span>
      </div>
      ${renderFormFeedback()}
      ${rows}
      <div class="action-row">
        <button class="text-button primary-submit-button" type="submit" ${readiness.ready && !saveBusy ? "" : "disabled"}>
          ${saveBusy ? "\uC800\uC7A5 \uC911" : "\uACB0\uACFC \uC800\uC7A5"}
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
        <span class="pill alert">\uC900\uBE44 \uC911</span>
      </div>
      <div class="todo-alert">\uC774 \uC885\uBAA9\uC740 \uC544\uC9C1 \uAD00\uB9AC\uC790 \uC800\uC7A5 RPC\uAC00 \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.</div>
    </section>
  `;
}

function renderGameForm(game) {
  const readiness = getGameReadiness(game.id);
  const result = getGameResult(game.id);

  if (game.sport === "\uB18D\uAD6C" || game.sport === "\uD48B\uC0B4") return renderScoreGameForm(game, result, readiness);
  if (game.sport === "\uC904\uB2E4\uB9AC\uAE30") return renderRopeGameForm(game, result, readiness);
  if (String(game.sport ?? "").includes("\uD53C\uAD6C")) return renderDodgeballGameForm(game, result, readiness);
  if (game.sport === "\uACC4\uC8FC") return renderRelayGameForm(game, readiness);

  return renderUnsupportedGameForm(game);
}

function renderTeamOptions(selectedTeamId) {
  return `
    <option value="">\uD559\uBC88 \uC120\uD0DD</option>
    ${state.teams
      .map(
        (team) => `
          <option value="${escapeHtml(team.id)}" ${team.id === selectedTeamId ? "selected" : ""}>
            ${escapeHtml(team.name)}
          </option>
        `,
      )
      .join("")}
  `;
}

function renderBoothScoreHistory(booth) {
  const savedRows = getBoothScores(booth.id);

  if (!savedRows.length) {
    return `<div class="todo-alert">\uC544\uC9C1 \uC800\uC7A5\uB41C \uAC1C\uC778 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>`;
  }

  return `
    <div class="booth-score-history">
      ${savedRows
        .map(
          (row) => `
            <div class="booth-score-history-row">
              <div>
                <strong>${escapeHtml(row.participantName || "\uC774\uB984 \uBBF8\uC785\uB825")}</strong>
                <p class="description">${escapeHtml(getTeamName(row.teamId))}</p>
              </div>
              <div class="history-actions">
                <strong>${escapeHtml(inputValue(row.scoreValue))}${escapeHtml(row.scoreUnit || getBoothScoreUnit(booth))}</strong>
                <button class="ghost-button" data-edit-booth-score="${escapeHtml(row.id)}" data-open-form="${escapeHtml(booth.id)}" type="button">\uC218\uC815</button>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderBoothScoreRows(booth) {
  const unit = getBoothScoreUnit(booth);
  const scoreLabel = unit === "kg" ? "\uAE30\uB85D(kg)" : "\uC810\uC218";
  const editingScore = getBoothScoreById(state.editingBoothScoreId);
  const isEditingCurrentBooth = editingScore?.boothId === booth.id;

  return `
    <div class="booth-score-row">
      <div class="field">
        <label>\uC774\uB984</label>
        <input name="participant_name" type="text" placeholder="\uC120\uD0DD" value="${escapeHtml(isEditingCurrentBooth ? editingScore.participantName : "")}" />
      </div>
      <div class="field">
        <label>\uD559\uBC88 \uD300</label>
        <select name="team_id">
          ${renderTeamOptions(isEditingCurrentBooth ? editingScore.teamId : "")}
        </select>
      </div>
      <div class="field">
        <label>${escapeHtml(scoreLabel)}</label>
        <input name="score_value" type="number" min="0" ${isShoeBooth(booth) ? 'max="50"' : ""} step="0.01" inputmode="decimal" value="${escapeHtml(isEditingCurrentBooth ? inputValue(editingScore.scoreValue) : "")}" />
      </div>
    </div>
  `;
}

function renderBoothScoresForm(booth) {
  const saveBusy = state.auth.pending === "save";
  const unit = getBoothScoreUnit(booth);
  const isEditingCurrentBooth = getBoothScoreById(state.editingBoothScoreId)?.boothId === booth.id;
  const submitLabel = saveBusy
    ? "\uC800\uC7A5 \uC911"
    : isEditingCurrentBooth
      ? "\uAE30\uB85D \uC218\uC815"
      : "\uBD80\uC2A4 \uAE30\uB85D \uC800\uC7A5";

  return `
    <form class="form-card" data-booth-form="scores" data-booth-id="${escapeHtml(booth.id)}" data-score-unit="${escapeHtml(unit)}">
      <div class="row-head">
        <div>
          <h2>${escapeHtml(booth.name)}</h2>
          <p class="time">${escapeHtml(booth.location)}</p>
        </div>
        <span class="pill ${statusClass(getBoothStatus(booth))}">${escapeHtml(getBoothStatus(booth))}</span>
      </div>
      ${renderFormFeedback()}
      ${
        isEditingCurrentBooth
          ? `
            <div class="auth-status">
              \uC800\uC7A5\uB41C \uAE30\uB85D\uC744 \uC218\uC815 \uC911\uC785\uB2C8\uB2E4.
              <button class="ghost-button" data-cancel-booth-edit type="button">\uCDE8\uC18C</button>
            </div>
          `
          : ""
      }
      ${renderBoothScoreRows(booth)}
      <div class="action-row">
        <button class="text-button primary-submit-button" type="submit" ${saveBusy ? "disabled" : ""}>
          ${submitLabel}
        </button>
      </div>
      <div class="section-title compact-title">
        <h3>\uC800\uC7A5\uB41C \uAE30\uB85D</h3>
        <p>${getBoothScores(booth.id).length}\uAC1C</p>
      </div>
      ${renderBoothScoreHistory(booth)}
    </form>
  `;
}

function renderBoothSessionForm(booth) {
  const saveBusy = state.auth.pending === "save";
  const session = getBoothSession(booth.id);
  const status = session?.sessionStatus || "open";

  return `
    <form class="form-card" data-booth-form="session" data-booth-id="${escapeHtml(booth.id)}">
      <div class="row-head">
        <div>
          <h2>${escapeHtml(booth.name)}</h2>
          <p class="time">${escapeHtml(booth.location)}</p>
        </div>
        <span class="pill ${statusClass(getBoothStatus(booth))}">${escapeHtml(getBoothStatus(booth))}</span>
      </div>
      ${renderFormFeedback()}
      <div class="form-grid two">
        <div class="field">
          <label>\uC6B4\uC601 \uC0C1\uD0DC</label>
          <select name="session_status">
            <option value="open" ${status === "open" ? "selected" : ""}>\uC6B4\uC601 \uC911</option>
            <option value="paused" ${status === "paused" ? "selected" : ""}>\uC77C\uC2DC \uC911\uB2E8</option>
            <option value="closed" ${status === "closed" ? "selected" : ""}>\uC885\uB8CC</option>
          </select>
        </div>
      </div>
      <div class="action-row">
        <button class="text-button" type="submit" ${saveBusy ? "disabled" : ""}>
          ${saveBusy ? "\uC800\uC7A5 \uC911" : "\uC0C1\uD0DC \uC800\uC7A5"}
        </button>
      </div>
    </form>
  `;
}

function renderBoothForm(booth) {
  return isScoringBooth(booth) ? renderBoothScoresForm(booth) : renderBoothSessionForm(booth);
}

function renderScoreboardPage() {
  app.innerHTML = `
    <div class="section-title">
      <div>
        <h2>\uC810\uC218\uD45C</h2>
      </div>
    </div>

    <section class="dashboard-stack">
      ${renderScoreboardCard({ showSources: true })}
    </section>
  `;
}

function renderOverview() {
  const blockedGames = state.games.filter((game) => game.kind === "game" && !getGameReadiness(game.id).ready);

  app.innerHTML = `
    <div class="section-title">
      <div>
        <h2>\uC804\uCCB4 \uD604\uD669</h2>
        <p>\uC6B4\uC601\uC9C4\uC774 \uD568\uAED8 \uBCFC \uC218 \uC788\uB294 \uACF5\uC720 \uD604\uD669\uD45C\uC785\uB2C8\uB2E4.</p>
      </div>
    </div>

    <section class="dashboard-stack">
      ${renderScoreboardCard({ showSources: true })}

      <article class="assignment-card">
        <h3>\uB300\uC9C4 \uBBF8\uC644\uC131 \uACBD\uAE30</h3>
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
              : `<div class="empty-state">\uD604\uC7AC \uC2DC\uC791 \uBCF4\uB958 \uC0C1\uD0DC\uB85C \uB0A8\uC740 \uACBD\uAE30\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div>`
          }
        </div>
      </article>

      <article class="assignment-card">
        <h3>\uBD80\uC2A4 \uC6B4\uC601 \uD604\uD669</h3>
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

function returnToFormList() {
  state.adminFormId = null;
  state.editingBoothScoreId = null;
  state.formFeedback = { kind: "", text: "" };
  if (!isSuperAdmin()) state.tab = "assignments";
}

document.addEventListener("click", async (event) => {
  const tabButton = event.target.closest("[data-tab]");
  if (tabButton && isLoggedIn()) {
    state.tab = tabButton.dataset.tab;
    if (state.tab !== "forms") {
      state.adminFormId = null;
      state.editingBoothScoreId = null;
    }
    render();
    return;
  }

  const toggleGroupButton = event.target.closest("[data-toggle-group]");
  if (toggleGroupButton && isLoggedIn()) {
    const groupName = toggleGroupButton.dataset.toggleGroup;
    if (state.expandedGroups.has(groupName)) state.expandedGroups.delete(groupName);
    else state.expandedGroups.add(groupName);
    saveExpandedGroups();
    render();
    return;
  }

  const scoreboardToggleButton = event.target.closest("[data-toggle-scoreboard-team]");
  if (scoreboardToggleButton && isLoggedIn()) {
    const teamId = scoreboardToggleButton.dataset.toggleScoreboardTeam;
    if (state.expandedScoreboardTeams.has(teamId)) state.expandedScoreboardTeams.delete(teamId);
    else state.expandedScoreboardTeams.add(teamId);
    render();
    return;
  }

  if (event.target.closest("[data-back-to-form-list]") && isLoggedIn()) {
    returnToFormList();
    render();
    return;
  }

  const editBoothScoreButton = event.target.closest("[data-edit-booth-score]");
  if (editBoothScoreButton && isLoggedIn()) {
    state.tab = "forms";
    state.adminFormId = editBoothScoreButton.dataset.openForm;
    state.editingBoothScoreId = editBoothScoreButton.dataset.editBoothScore;
    state.formFeedback = { kind: "", text: "" };
    render();
    return;
  }

  if (event.target.closest("[data-cancel-booth-edit]") && isLoggedIn()) {
    state.editingBoothScoreId = null;
    state.formFeedback = { kind: "", text: "" };
    render();
    return;
  }

  const openFormButton = event.target.closest("[data-open-form]");
  if (openFormButton && isLoggedIn()) {
    state.tab = "forms";
    state.adminFormId = openFormButton.dataset.openForm;
    state.editingBoothScoreId = null;
    state.formFeedback = { kind: "", text: "" };
    render();
    return;
  }

  const startButton = event.target.closest("[data-start-item]");
  if (startButton && isLoggedIn()) {
    await handleStartItem(startButton.dataset.startItem, startButton.dataset.startType);
    return;
  }

  if (event.target.closest("[data-logout]")) {
    await handleLogout();
  }
});

document.addEventListener("input", (event) => {
  if (!event.target.closest("[data-score-input]")) return;
  const form = event.target.closest("[data-score-game-form]");
  syncTiebreakVisibility(form);
});

document.addEventListener("submit", async (event) => {
  const loginForm = event.target.closest("[data-auth-form='login']");
  if (loginForm) {
    event.preventDefault();
    await handleLoginSubmit(new FormData(loginForm));
    return;
  }

  const manualAdvancementForm = event.target.closest("[data-manual-advancement-form]");
  if (manualAdvancementForm && isLoggedIn()) {
    event.preventDefault();
    await handleManualAdvancementSubmit(manualAdvancementForm);
    return;
  }

  const resultForm = event.target.closest("[data-result-form]");
  if (resultForm && isLoggedIn()) {
    event.preventDefault();
    await handleResultSubmit(resultForm);
    return;
  }

  const boothForm = event.target.closest("[data-booth-form]");
  if (boothForm && isLoggedIn()) {
    event.preventDefault();
    await handleBoothSubmit(boothForm);
  }
});


