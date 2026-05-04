import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '../components/PageHeader';
import EventCard from '../components/EventCard';
import EventBottomSheet from '../components/EventBottomSheet';

const formatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export default function Events({ data }) {
  const games = data?.games || [];
  const teams = data?.teams || [];
  const results = data?.game_results || [];
  const resultSets = data?.game_result_sets || [];
  const gameRankings = data?.game_rankings || [];
  const gameAdvancements = data?.game_advancements || [];
  const scrollRef = useRef(null);
  const panelRef = useRef(null);
  const [selectedGame, setSelectedGame] = useState(null);

  const isNonMatchEvent = (title, sport) => {
    if (!sport || sport.trim() === '') return true;
    const t = (title || '').toLowerCase();
    if (t.includes('집합') || t.includes('개회사') || t.includes('체조') || t.includes('점심') || t.includes('식사') || t.includes('폐회') || t.includes('시상') || t.includes('휴식')) return true;
    return false;
  };

  const getTeamName = (id) => teams.find(t => t.id === id)?.name || '팀 미정';
  
  const getMatchup = (game) => {
    if (isNonMatchEvent(game.title, game.sport)) return null;
    const res = results.find(r => r.game_id === game.id);
    if (!res) return '대진표 미정';
    return `${getTeamName(res.left_team_id)} vs ${getTeamName(res.right_team_id)}`;
  };

  const getLocation = (game) => {
    if (game.location) return game.location;
    if (isNonMatchEvent(game.title, game.sport)) return null; // 행사나 점심시간은 장소 미정 숨김
    return '장소 미정';
  };

  const getScore = (gameId) => {
    const res = results.find(r => r.game_id === gameId);
    if (!res) return { left: 0, right: 0 };
    return { left: res.left_score || 0, right: res.right_score || 0 };
  };

  const getIcon = (sport) => {
    if (!sport) return 'emoji_events';
    const s = sport.toLowerCase();
    if (s.includes('농구') || s.includes('basketball')) return 'sports_basketball';
    if (s.includes('축구') || s.includes('풋살') || s.includes('soccer')) return 'sports_soccer';
    if (s.includes('피구') || s.includes('dodgeball')) return 'sports_volleyball'; 
    if (s.includes('줄다리기')) return 'front_hand';
    if (s.includes('계주') || s.includes('달리기') || s.includes('relay')) return 'directions_run';
    return 'emoji_events';
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      return formatter.format(new Date(timeString));
    } catch(e) { return ''; }
  };

  const sortedGames = [...games].sort((a, b) => new Date(a.scheduled_start_time) - new Date(b.scheduled_start_time));
  const firstInProgressIdx = sortedGames.findIndex(g => g.status === 'in_progress');
  const hasInProgress = firstInProgressIdx !== -1;

  useEffect(() => {
    // 탭 이동 시 무조건 맨 위에서 시작
    window.scrollTo(0, 0);
    if (panelRef.current) panelRef.current.scrollTop = 0;
    
    if (scrollRef.current) {
      setTimeout(() => {
        const element = scrollRef.current;
        const panel = panelRef.current;
        
        // 데스크톱: 패널이 독립 스크롤 (overflow-y: auto)
        // 모바일: 페이지 전체가 스크롤 (window)
        const isDesktop = panel && window.getComputedStyle(panel).overflowY === 'auto';
        
        if (isDesktop) {
          // 데스크톱: 패널 내부 스크롤
          const targetY = element.offsetTop - 100;
          const startY = panel.scrollTop;
          const difference = targetY - startY;
          const duration = 1200;
          const startTime = performance.now();

          function step(currentTime) {
            const progress = (currentTime - startTime) / duration;
            if (progress < 1) {
              const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
              panel.scrollTop = startY + difference * ease;
              requestAnimationFrame(step);
            } else {
              panel.scrollTop = targetY;
            }
          }
          requestAnimationFrame(step);
        } else {
          // 모바일: window 스크롤
          const targetY = element.getBoundingClientRect().top + window.scrollY - 100;
          const startY = window.scrollY;
          const difference = targetY - startY;
          const duration = 1200;
          const startTime = performance.now();

          function step(currentTime) {
            const progress = (currentTime - startTime) / duration;
            if (progress < 1) {
              const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
              window.scrollTo(0, startY + difference * ease);
              requestAnimationFrame(step);
            } else {
              window.scrollTo(0, targetY);
            }
          }
          requestAnimationFrame(step);
        }
      }, 800);
    }
  }, [games.length]);

  return (
    <>
    <main className="w-full max-w-5xl mx-auto px-5 md:px-8 pt-8 md:pt-0 pb-32 md:pb-0 md:flex md:gap-12 md:h-[calc(100vh-64px)] md:overflow-hidden">
      {/* Left Panel */}
      <div className="md:w-[45%] md:flex md:flex-col md:items-center md:justify-center mb-8 md:mb-0">
        <div className="w-full max-w-[400px] xl:max-w-[450px]">
          <PageHeader title="경기 종목" />
        </div>
      </div>
      
      {/* Right Panel */}
      <div ref={panelRef} className="md:w-[55%] flex flex-col gap-4 w-full md:overflow-y-auto md:py-12 md:pl-1 md:pr-4 scrollbar-hide">
        {sortedGames.length === 0 ? (
          <p className="text-center text-gray-400 font-cafe24">예정된 경기가 없습니다.</p>
        ) : (
          sortedGames.map((game, idx) => {
            const scores = getScore(game.id);
            const timeStr = formatTime(game.scheduled_start_time) ? `${formatTime(game.scheduled_start_time)} - ${formatTime(game.scheduled_end_time)}` : '시간 미정';
            const isTarget = idx === firstInProgressIdx;
            
            return (
              <motion.div 
                key={game.id} 
                ref={isTarget ? scrollRef : null} 
                className="w-full"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, type: 'spring', stiffness: 250, damping: 20, delay: idx * 0.05 }}
              >
                <EventCard 
                  icon={getIcon(game.sport)}
                  sportType={game.sport || 'EVENT'}
                  title={game.title}
                  location={getLocation(game)}
                  time={timeStr}
                  status={game.status}
                  scoreLeft={scores.left}
                  scoreRight={scores.right}
                  onClick={() => setSelectedGame(game)}
                />
              </motion.div>
            )
          })
        )}
      </div>
    </main>

    {/* Event Bottom Sheet */}
    <AnimatePresence>
      {selectedGame && (
        <EventBottomSheet
          game={selectedGame}
          result={results.find(r => r.game_id === selectedGame.id)}
          allGames={games}
          allResults={results}
          advancements={gameAdvancements}
          resultSets={resultSets}
          gameRankings={gameRankings}
          teams={teams}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </AnimatePresence>
    </>
  )
}
