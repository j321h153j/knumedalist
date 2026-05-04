import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home({ data }) {
  const games = data?.games || [];
  const teams = data?.teams || [];
  const results = data?.game_results || [];

  const getTeamName = (id) => teams.find(t => t.id === id)?.name || '팀 미정';
  
  const isNonMatchEvent = (title, sport) => {
    if (!sport || sport.trim() === '') return true;
    const t = (title || '').toLowerCase();
    if (t.includes('집합') || t.includes('개회사') || t.includes('체조') || t.includes('점심') || t.includes('식사') || t.includes('폐회') || t.includes('시상') || t.includes('휴식')) return true;
    return false;
  };

  const getMatchup = (game) => {
    if (isNonMatchEvent(game.title, game.sport)) return null;
    const res = results.find(r => r.game_id === game.id);
    if (!res) return '대진표 미정';
    return `${getTeamName(res.left_team_id)} vs ${getTeamName(res.right_team_id)}`;
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

  // 진행 중인 경기만 필터링
  const ongoingGames = games
    .filter(g => g.status === 'in_progress')
    .sort((a, b) => new Date(a.scheduled_start_time) - new Date(b.scheduled_start_time));

  return (
    <main className="relative w-full h-[100dvh] md:h-[calc(100vh-64px)] bg-black overflow-hidden flex flex-col md:justify-center">
      
      {/* 데스크탑 배경 처리 (좌측 블랙, 우측 그라데이션) */}
      <div className="hidden md:block absolute inset-0 z-0">
        <div className="flex w-full h-full">
          <div className="w-1/2 bg-black"></div>
          <div className="w-1/2 bg-gradient-to-l from-[#0a0a0a] to-black border-l border-gray-900/50"></div>
        </div>
      </div>

      <div className="relative w-full md:max-w-5xl mx-auto flex flex-col md:flex-row h-full z-10 md:px-8">
        {/* 1. 배경 포스터 이미지 (모바일: 전체화면, 데스크탑: 좌측 45%) */}
        <div className="absolute inset-0 md:relative md:w-[45%] md:h-full z-0 flex items-center justify-center bg-black overflow-hidden">
          <img 
            src="/poster.jpg" 
            alt="행운제 2026 포스터" 
            className="w-full h-full object-contain scale-[1.02]"
          />
          {/* 모바일에서만 포스터 아래쪽을 살짝 어둡게 그라데이션 처리 */}
          <div className="md:hidden absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* 2. 실시간 라이브 위젯 (모바일: 하단 플로팅, 데스크탑: 우측 55%) */}
        <div className="absolute bottom-[100px] left-0 right-0 px-4 md:static md:w-[55%] md:h-full md:px-12 z-20 flex flex-col md:items-center md:justify-center gap-3 max-h-[300px] md:max-h-full overflow-y-auto scrollbar-hide pointer-events-none md:pointer-events-auto">
          
          {/* 데스크탑 전용 타이틀 */}
          <div className="hidden md:flex flex-col items-center mb-8 pointer-events-auto text-center w-full max-w-md mx-auto">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
              </span>
              <h2 className="font-cafe24 text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 tracking-widest drop-shadow-lg">LIVE NOW</h2>
            </div>
            <p className="text-gray-400 font-lexend text-sm">현재 치열하게 진행 중인 경기 현황</p>
          </div>

          {/* 위젯 리스트 */}
          <div className="flex flex-col gap-3 w-full max-w-md mx-auto pointer-events-auto pb-4 md:pb-0">
            <AnimatePresence>
              {ongoingGames.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="hidden md:flex flex-col items-center justify-center p-10 border border-gray-800 rounded-2xl bg-white/5 backdrop-blur-sm"
                >
                  <span className="material-symbols-outlined text-gray-500 text-4xl mb-3">sports_score</span>
                  <p className="text-gray-400 font-cafe24 text-lg">현재 진행 중인 경기가 없습니다</p>
                </motion.div>
              )}

              {ongoingGames.map((game, idx) => {
                const scores = getScore(game.id);
                return (
                  <motion.div 
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: idx * 0.1 }}
                    className="flex items-center gap-3 bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-white/50 shadow-[0_8px_30px_rgba(236,72,153,0.25)] hover:scale-[1.02] transition-transform cursor-default w-full"
                  >
                    {/* 🔴 깜빡이는 라이브 뱃지 */}
                    <div className="relative flex h-2 w-2 shrink-0 ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                    </div>
                    
                    {/* 종목 아이콘 */}
                    <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center shrink-0 border border-pink-100">
                      <span className="material-symbols-outlined text-[20px] text-pink-500" style={{fontVariationSettings: "'FILL' 1"}}>
                        {getIcon(game.sport)}
                      </span>
                    </div>
                    
                    {/* 타이틀 */}
                    <div className="flex-1 flex flex-col overflow-hidden px-1 justify-center">
                      <span className="text-[13px] text-gray-900 font-cafe24 truncate tracking-wide">{game.title}</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}
