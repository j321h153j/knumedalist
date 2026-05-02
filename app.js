const { demoTime, games, booths, resultSports, rankings } = window.EVENT_DATA;
const demoMinutes = toMinutes(demoTime);

const app = document.querySelector("#app");
const tabButtons = [...document.querySelectorAll(".tab-button")];

const state = {
  tab: "now",
  sportFilter: "전체",
  boothFilter: "운영 중",
  activeGameId: null,
  activeBoothId: null,
  activeResultSportId: null,
  resultView: "sports",
};

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

function getStatus(start, end) {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (demoMinutes >= startMinutes && demoMinutes < endMinutes) return "진행 중";
  if (demoMinutes >= endMinutes) return "종료";
  return "예정";
}

function statusClass(status) {
  if (status === "진행 중" || status === "운영 중") return "live";
  if (status === "종료") return "done";
  return "next";
}

function getBoothStatus(booth) {
  return getStatus(booth.start, booth.end).replace("진행 중", "운영 중");
}

function getCurrentGames() {
  return games.filter((game) => getStatus(game.start, game.end) === "진행 중");
}

function getNextItems(limit = 4) {
  return games
    .filter((game) => toMinutes(game.start) > demoMinutes)
    .sort((left, right) => toMinutes(left.start) - toMinutes(right.start))
    .slice(0, limit);
}

function getTimePeriods() {
  return [
    { key: "오전", start: 0, end: toMinutes("11:59") },
    { key: "점심", start: toMinutes("12:00"), end: toMinutes("12:59") },
    { key: "오후", start: toMinutes("13:00"), end: toMinutes("23:59") },
  ];
}

function render() {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.tab);
  });

  if (state.tab === "now") renderNow();
  if (state.tab === "games") renderGames();
  if (state.tab === "booths") renderBooths();
  if (state.tab === "results") renderResults();
}

function renderNow() {
  const current = getCurrentGames();
  const nextItems = getNextItems(4);
  const currentTitle = current.length ? current.map((item) => item.title).join(" / ") : "점심시간";
  const currentMeta = current.length
    ? `${formatRange(current[0].start, current[0].end)} · ${current[0].location}`
    : "오후 1시 출석체크 후 다음 경기로 이동";

  app.innerHTML = `
    <section class="notice">
      <span class="notice-mark">!</span>
      <p>기준 시각은 ${formatTimeLabel(demoTime)}입니다. 학생 화면은 지금 진행 중 경기와 다음 일정만 빠르게 보여줍니다.</p>
    </section>

    <section class="hero-card">
      <span class="hero-status">지금 진행 중</span>
      <h2 class="hero-title">${currentTitle}</h2>
      <p class="hero-meta">${currentMeta}</p>
      <p class="tiny-note">지도와 세부 정보는 경기 상세와 미니부스 상세에서 확인합니다.</p>
    </section>

    <div class="section-title">
      <h2>다음 일정</h2>
      <p>오늘 순서대로 보기</p>
    </div>
    <section class="list-stack">
      ${nextItems.map(renderSimpleRow).join("")}
    </section>
  `;
}

function renderSimpleRow(item) {
  const status = getStatus(item.start, item.end);
  const pill = status === "진행 중" ? `<span class="pill live">지금</span>` : "";

  return `
    <article class="${item.kind === "game" ? "event-row" : "support-row"} ${status === "진행 중" ? "live" : ""}">
      <div class="row-head">
        <div>
          <h3>${item.title}</h3>
          <p class="time">${formatRange(item.start, item.end)}</p>
        </div>
        ${pill}
      </div>
      <p class="description">${item.location}</p>
    </article>
  `;
}

function renderGames() {
  const selectedGame = games.find((game) => game.id === state.activeGameId);
  if (selectedGame) {
    renderGameDetail(selectedGame);
    return;
  }

  const sports = ["전체", "풋살", "농구", "줄다리기", "피구", "계주"];
  const filteredGames = games.filter((game) => state.sportFilter === "전체" || game.sport === state.sportFilter);

  const groups = getTimePeriods()
    .map((period) => ({
      ...period,
      items: filteredGames.filter((game) => {
        const startMinutes = toMinutes(game.start);
        return startMinutes >= period.start && startMinutes <= period.end;
      }),
    }))
    .filter((group) => group.items.length);

  app.innerHTML = `
    <div class="section-title">
      <div>
        <h2>본게임 일정</h2>
        <p>시간표처럼 훑고 필요한 경기만 눌러서 상세를 봅니다.</p>
      </div>
    </div>

    <section class="filter-bar" aria-label="종목 필터">
      ${sports
        .map(
          (sport) => `
            <button class="chip ${state.sportFilter === sport ? "active" : ""}" data-filter-type="sport" data-filter-value="${sport}" type="button">
              ${sport}
            </button>
          `,
        )
        .join("")}
    </section>

    <section>
      ${groups
        .map(
          (group) => `
            <div class="round-block">
              <p class="round-name">${group.key}</p>
              <div class="list-stack">
                ${group.items.map(renderTimelineRow).join("")}
              </div>
            </div>
          `,
        )
        .join("")}
    </section>
  `;
}

function renderTimelineRow(game) {
  const status = getStatus(game.start, game.end);

  if (game.kind === "support") {
    return `
      <article class="support-row">
        <div>
          <h3>${game.title}</h3>
          <p class="time">${formatRange(game.start, game.end)}</p>
        </div>
        <p class="description">${game.summary}</p>
      </article>
    `;
  }

  return `
    <article class="event-row ${status === "진행 중" ? "live" : ""}">
      <div class="row-head">
        <div>
          <h3>${game.title}</h3>
          <p class="time">${formatRange(game.start, game.end)}</p>
        </div>
        <span class="pill ${statusClass(status)}">${status}</span>
      </div>
      <p class="description">${game.summary}</p>
      <div class="action-row">
        <button class="text-button" data-game-id="${game.id}" type="button">상세 보기</button>
      </div>
    </article>
  `;
}

function renderGameDetail(game) {
  const status = getStatus(game.start, game.end);

  app.innerHTML = `
    <section class="detail-card">
      <div class="detail-top">
        <button class="icon-button" data-back-games type="button" aria-label="본게임 목록으로"></button>
        <span class="pill ${statusClass(status)}">${status}</span>
      </div>

      <h2>${game.title}</h2>
      <p class="time">${formatRange(game.start, game.end)} · ${game.location}</p>

      <div class="info-panel">
        <h4>경기 안내</h4>
        <p class="description">${game.summary}</p>
        ${game.dependency ? `<p class="description">운영 참고: ${game.dependency}</p>` : ""}
      </div>

      ${renderGameMap(game)}
    </section>
  `;
}

function renderGameMap(game) {
  if (game.mapKey === "multipurpose") {
    return `
      <section class="section-title">
        <h2>위치</h2>
        <p>다목적 구장</p>
      </section>
      <article class="map-card">
        <div class="mini-map">
          <div class="court-layout">
            <div class="court-box sky">농구 코트 1</div>
            <div class="court-box sky">농구 코트 2</div>
            <div class="court-box hide">미사용 구역</div>
            <div class="futsal-box">풋살 경기장</div>
          </div>
        </div>
        <div class="map-caption">
          <h4>다목적 구장 도식</h4>
          <p class="description">농구는 좌측 코트, 풋살은 우측 큰 코트에서 진행합니다.</p>
        </div>
      </article>
    `;
  }

  const map =
    game.mapKey === "relay"
      ? {
          path: "./assets/relay-map.jpg",
          title: "계주 지도",
          desc: "출발선과 결승선을 먼저 확인해두면 동선이 훨씬 직관적입니다.",
        }
      : game.mapKey === "dodgeball"
        ? {
            path: "./assets/dodgeball-map.jpg",
            title: "피구 배치도",
            desc: "남녀 피구 코트 위치와 미니부스 라인을 함께 확인할 수 있습니다.",
          }
        : {
            path: "./assets/stadium-zones.jpg",
            title: "대운동장 배치",
            desc: "줄다리기, 미니부스, 대기 공간 위치를 한 번에 보여줍니다.",
          };

  return `
    <section class="section-title">
      <h2>위치</h2>
      <p>지도 보기</p>
    </section>
    <article class="map-card">
      <img src="${map.path}" alt="${map.title}" />
      <div class="map-caption">
        <h4>${map.title}</h4>
        <p class="description">${map.desc}</p>
      </div>
    </article>
  `;
}

function renderBooths() {
  const selectedBooth = booths.find((booth) => booth.id === state.activeBoothId);
  if (selectedBooth) {
    renderBoothDetail(selectedBooth);
    return;
  }

  const filteredBooths =
    state.boothFilter === "운영 중"
      ? booths.filter((booth) => getBoothStatus(booth) === "운영 중")
      : booths;

  app.innerHTML = `
    <div class="section-title">
      <div>
        <h2>미니부스</h2>
        <p>운영 중인 부스부터 보고 자세한 위치는 상세에서 확인합니다.</p>
      </div>
    </div>

    <section class="filter-bar" aria-label="미니부스 필터">
      <button class="chip ${state.boothFilter === "운영 중" ? "active" : ""}" data-filter-type="booth" data-filter-value="운영 중" type="button">운영 중</button>
      <button class="chip ${state.boothFilter === "전체" ? "active" : ""}" data-filter-type="booth" data-filter-value="전체" type="button">전체</button>
    </section>

    <section class="card-grid">
      ${filteredBooths.map(renderBoothCard).join("")}
    </section>
  `;
}

function renderBoothCard(booth) {
  const status = getBoothStatus(booth);

  return `
    <article class="booth-card">
      <div class="row-head">
        <div>
          <h3>${booth.name}</h3>
          <p class="time">${formatRange(booth.start, booth.end)}</p>
        </div>
        <span class="pill ${statusClass(status)}">${status}</span>
      </div>
      <p class="description">${booth.summary}</p>
      <p class="time">${booth.location}</p>
      ${booth.currentSession ? `<p class="description">현재 타임: ${booth.currentSession}</p>` : ""}
      <div class="action-row">
        <button class="text-button" data-booth-id="${booth.id}" type="button">자세히</button>
      </div>
    </article>
  `;
}

function renderBoothDetail(booth) {
  app.innerHTML = `
    <section class="detail-card">
      <div class="detail-top">
        <button class="icon-button" data-back-booths type="button" aria-label="미니부스 목록으로"></button>
        <span class="pill ${statusClass(getBoothStatus(booth))}">${getBoothStatus(booth)}</span>
      </div>

      <h2>${booth.name}</h2>
      <p class="time">${formatRange(booth.start, booth.end)} · ${booth.location}</p>

      <div class="info-panel">
        <h4>참여 안내</h4>
        <p class="description">${booth.guide}</p>
      </div>

      ${renderBoothOptional(booth)}

      <article class="map-card">
        <img src="./assets/stadium-zones.jpg" alt="대운동장 미니부스 지도" />
        <div class="map-caption">
          <h4>미니부스 위치</h4>
          <p class="description">${booth.mapCaption}</p>
        </div>
      </article>
    </section>
  `;
}

function renderBoothOptional(booth) {
  if (booth.leaderboard) {
    return `
      <div class="info-panel">
        <h4>현재 랭킹</h4>
        <div class="list-stack">
          ${booth.leaderboard
            .map(
              (entry, index) => `
                <div class="ranking-row">
                  <span class="rank">${index + 1}</span>
                  <strong>${entry.name} · ${entry.team}</strong>
                  <span class="score">${entry.record}</span>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  if (booth.teamTotals) {
    return `
      <div class="info-panel">
        <h4>학번별 합계</h4>
        <div class="list-stack">
          ${booth.teamTotals
            .map(
              (entry) => `
                <div class="row-split session-row">
                  <strong>${entry.team}</strong>
                  <span class="score">${entry.score}점</span>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  if (booth.currentSession) {
    return `
      <div class="info-panel">
        <h4>현재 타임</h4>
        <p class="description">${booth.currentSession}</p>
      </div>
    `;
  }

  return "";
}

function renderResults() {
  const selectedSport = resultSports.find((sport) => sport.id === state.activeResultSportId);
  if (state.resultView === "sports" && selectedSport) {
    renderResultDetail(selectedSport);
    return;
  }

  app.innerHTML = `
    <div class="section-title">
      <div>
        <h2>결과</h2>
        <p>일정과 분리해서 스코어와 순위만 모아 봅니다.</p>
      </div>
    </div>

    <section class="tab-row" aria-label="결과 보기">
      <button class="segment ${state.resultView === "sports" ? "active" : ""}" data-result-view="sports" type="button">종목별</button>
      <button class="segment ${state.resultView === "ranking" ? "active" : ""}" data-result-view="ranking" type="button">종합 순위</button>
    </section>

    ${
      state.resultView === "sports"
        ? `
          <section class="card-grid">
            ${resultSports
              .map(
                (sport) => `
                  <article class="result-card">
                    <div class="row-head">
                      <div>
                        <h3>${sport.name}</h3>
                        <p class="result-summary">${sport.summary}</p>
                      </div>
                      <span class="pill map">${sport.rounds.length}라운드</span>
                    </div>
                    <div class="action-row">
                      <button class="text-button" data-result-sport-id="${sport.id}" type="button">결과 보기</button>
                    </div>
                  </article>
                `,
              )
              .join("")}
          </section>
        `
        : `
          <section class="card-grid">
            ${rankings
              .map(
                (entry, index) => `
                  <article class="ranking-row">
                    <span class="rank">${index + 1}</span>
                    <strong>${entry.team}</strong>
                    <span class="score">${entry.score}점</span>
                  </article>
                `,
              )
              .join("")}
          </section>
        `
    }
  `;
}

function renderResultDetail(sport) {
  app.innerHTML = `
    <section class="detail-card">
      <div class="detail-top">
        <button class="icon-button" data-back-results type="button" aria-label="결과 목록으로"></button>
        <span class="pill map">${sport.name}</span>
      </div>

      <h2>${sport.name}</h2>
      <p class="description">${sport.summary}</p>

      <section class="section-title">
        <h2>경기 결과</h2>
        <p>라운드별</p>
      </section>

      ${sport.rounds
        .map(
          (round) => `
            <div class="round-block">
              <p class="round-name">${round.name}</p>
              <div class="card-grid">
                ${round.matches
                  .map(
                    (match) => `
                      <article class="match-card">
                        <h3>${match.label}</h3>
                        <div class="match-score">
                          <span>${match.left}</span>
                          <span>${match.score || "-"}</span>
                          <span>${match.right}</span>
                        </div>
                        ${match.extra ? `<p class="description">${match.extra}</p>` : ""}
                        ${match.winner ? `<div class="winner-note">승자: ${match.winner}</div>` : ""}
                      </article>
                    `,
                  )
                  .join("")}
              </div>
            </div>
          `,
        )
        .join("")}
    </section>
  `;
}

document.addEventListener("click", (event) => {
  const tabButton = event.target.closest("[data-tab]");
  if (tabButton) {
    state.tab = tabButton.dataset.tab;
    state.activeGameId = null;
    state.activeBoothId = null;
    state.activeResultSportId = null;
    render();
    return;
  }

  const sportFilterButton = event.target.closest("[data-filter-type='sport']");
  if (sportFilterButton) {
    state.sportFilter = sportFilterButton.dataset.filterValue;
    render();
    return;
  }

  const boothFilterButton = event.target.closest("[data-filter-type='booth']");
  if (boothFilterButton) {
    state.boothFilter = boothFilterButton.dataset.filterValue;
    render();
    return;
  }

  const gameButton = event.target.closest("[data-game-id]");
  if (gameButton) {
    state.activeGameId = gameButton.dataset.gameId;
    render();
    return;
  }

  if (event.target.closest("[data-back-games]")) {
    state.activeGameId = null;
    render();
    return;
  }

  const boothButton = event.target.closest("[data-booth-id]");
  if (boothButton) {
    state.activeBoothId = boothButton.dataset.boothId;
    render();
    return;
  }

  if (event.target.closest("[data-back-booths]")) {
    state.activeBoothId = null;
    render();
    return;
  }

  const resultViewButton = event.target.closest("[data-result-view]");
  if (resultViewButton) {
    state.resultView = resultViewButton.dataset.resultView;
    state.activeResultSportId = null;
    render();
    return;
  }

  const resultSportButton = event.target.closest("[data-result-sport-id]");
  if (resultSportButton) {
    state.activeResultSportId = resultSportButton.dataset.resultSportId;
    render();
    return;
  }

  if (event.target.closest("[data-back-results]")) {
    state.activeResultSportId = null;
    render();
  }
});

render();
