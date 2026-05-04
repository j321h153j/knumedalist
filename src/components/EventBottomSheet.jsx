import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import VisualBracket from './VisualBracket';

const formatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export default function EventBottomSheet({ game, result, allGames, allResults, advancements, resultSets, gameRankings, teams, onClose }) {
  const sheetRef = useRef(null);
  const dragControls = useDragControls();

  const handleClose = () => {
    onClose();
    if (window.history.state?.modal === 'event') {
      window.history.back();
    }
  };

  useEffect(() => {
    window.history.pushState({ modal: 'event' }, '');
    
    const handlePopState = () => {
      onClose(); // 브라우저/안드로이드 뒤로가기 발생 시 닫기
    };
    
    const handleKeyDown = (e) => { 
      if (e.key === 'Escape') handleClose(); 
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!game) return null;

  const getTeamName = (id) => teams?.find(t => t.id === id)?.name || '팀 미정';

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try { return formatter.format(new Date(timeString)); }
    catch(e) { return ''; }
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

  // 상태 뱃지
  const getStatusBadge = () => {
    if (game.status === 'in_progress') return { text: '진행 중', color: 'bg-green-50 text-green-700', dot: true };
    if (game.status === 'completed') return { text: '경기 종료', color: 'bg-gray-100 text-gray-600', dot: false };
    if (game.status === 'scheduled') return { text: '예정', color: 'bg-yellow-50 text-yellow-700', dot: false };
    return { text: '상태 미상', color: 'bg-gray-100 text-gray-500', dot: false };
  };

  const status = getStatusBadge();

  // 세트 정보 (줄다리기/피구)
  const sets = resultSets
    ?.filter(s => s.game_id === game.id)
    .sort((a, b) => a.set_number - b.set_number) || [];

  // 계주 순위
  const rankings = gameRankings
    ?.filter(r => r.game_id === game.id)
    .sort((a, b) => a.rank_order - b.rank_order) || [];

  // 줄다리기인지 피구인지
  const isRope = game.sport?.includes('줄다리기');
  const isDodgeball = game.sport?.includes('피구');
  const isRelay = game.sport?.includes('계주');

  // 승자 하이라이트
  const winnerText = result?.winner_team_id ? getTeamName(result.winner_team_id) : null;

  // 대진표 데이터 계산
  const bracketGames = allGames?.filter(g => g.sport === game.sport && (g.kind === 'game' || !g.kind)) || [];
  
  const rounds = bracketGames.reduce((acc, g) => {
    const r = g.round || '기타';
    if (!acc[r]) acc[r] = [];
    acc[r].push(g);
    return acc;
  }, {});

  // 라운드 정렬 순서 (결승이 가장 위로 오게)
  const roundOrder = { '결승': 1, '부결승': 2, '4강': 3, '8강': 4, '예선': 5, '기타': 99 };
  const sortedRounds = Object.keys(rounds).sort((a, b) => (roundOrder[a] || 99) - (roundOrder[b] || 99));
  
  // 계주가 아니고 경기가 2개 이상일 때만 대진표 표시
  const hasBracket = bracketGames.length > 1 && !isRelay;

  return (
    <AnimatePresence>
      {/* 배경 오버레이 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleClose}
        className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      />

      {/* 바텀 시트 */}
      <motion.div
        ref={sheetRef}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          if (info.offset.y > 100 || info.velocity.y > 500) {
            handleClose();
          }
        }}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        className="fixed bottom-0 left-0 right-0 z-[9999] bg-white rounded-t-[28px] shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* 드래그 핸들 (이 부분만 잡고 끌 수 있음) */}
        <div 
          className="flex justify-center pt-4 pb-3 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="w-12 h-1.5 rounded-full bg-gray-300" />
        </div>

        {/* 콘텐츠 */}
        <div className="overflow-y-auto px-6 pb-10 scrollbar-hide">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-pink-600 text-[24px]" style={{fontVariationSettings: "'FILL' 1"}}>{getIcon(game.sport)}</span>
              </div>
              <div>
                <span className="inline-block w-fit bg-pink-50 text-pink-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">{game.sport}</span>
                <h2 className="font-cafe24 text-xl font-bold text-gray-900 mt-0.5">{game.title}</h2>
              </div>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <span className="material-symbols-outlined text-gray-500 text-[18px]">close</span>
            </button>
          </div>

          {/* 상태 뱃지 */}
          <div className="mb-5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold ${status.color}`}>
              {status.dot && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              )}
              {status.text}
            </span>
          </div>

          {/* 대진 & 점수 (1:1 경기) */}
          {result && !isRelay && (
            <div className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between">
                {/* 왼쪽 팀 */}
                <div className="flex-1 text-center">
                  <p className={`font-cafe24 text-lg font-bold ${result.winner_team_id === result.left_team_id ? 'text-pink-600' : 'text-gray-800'}`}>
                    {getTeamName(result.left_team_id)}
                  </p>
                  {result.winner_team_id === result.left_team_id && (
                    <span className="text-[11px] text-pink-500 font-lexend font-bold">WIN</span>
                  )}
                </div>
                
                {/* 점수 */}
                <div className="px-4">
                  {game.status === 'completed' ? (
                    <div className="flex items-center gap-3">
                      <span className="font-lexend text-3xl font-black text-gray-900">{result.left_score ?? '-'}</span>
                      <span className="font-lexend text-xl text-gray-400">:</span>
                      <span className="font-lexend text-3xl font-black text-gray-900">{result.right_score ?? '-'}</span>
                    </div>
                  ) : (
                    <span className="font-lexend text-2xl font-bold text-gray-300">VS</span>
                  )}
                </div>

                {/* 오른쪽 팀 */}
                <div className="flex-1 text-center">
                  <p className={`font-cafe24 text-lg font-bold ${result.winner_team_id === result.right_team_id ? 'text-pink-600' : 'text-gray-800'}`}>
                    {getTeamName(result.right_team_id)}
                  </p>
                  {result.winner_team_id === result.right_team_id && (
                    <span className="text-[11px] text-pink-500 font-lexend font-bold">WIN</span>
                  )}
                </div>
              </div>

              {/* 타이브레이크 */}
              {result.tiebreak_type && result.tiebreak_type !== 'none' && (
                <div className="mt-3 pt-3 border-t border-pink-200/50 text-center">
                  <span className="text-[11px] text-gray-400 font-lexend uppercase tracking-wider">
                    {result.tiebreak_type === 'free_throw' ? '자유투' : result.tiebreak_type === 'penalty_shootout' ? '승부차기' : result.tiebreak_type}
                  </span>
                  <p className="font-lexend text-sm font-bold text-gray-600 mt-0.5">
                    {result.left_tiebreak_score} : {result.right_tiebreak_score}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 세트 상세 (줄다리기/피구) */}
          {sets.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="font-cafe24 text-sm font-bold text-gray-700">세트별 결과</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {sets.map(set => {
                  const leftWin = isRope
                    ? (set.left_score > set.right_score)
                    : (set.left_score > set.right_score); // survivors
                  const rightWin = !leftWin && set.left_score !== set.right_score;
                  
                  return (
                    <div key={set.set_number} className="flex items-center px-4 py-3">
                      <span className="font-lexend text-xs text-gray-400 w-16">{set.set_number}세트</span>
                      <div className="flex-1 flex items-center justify-center gap-4">
                        <span className={`font-lexend font-bold text-lg ${leftWin ? 'text-pink-600' : 'text-gray-400'}`}>
                          {set.left_score}
                        </span>
                        <span className="text-gray-300">:</span>
                        <span className={`font-lexend font-bold text-lg ${rightWin ? 'text-pink-600' : 'text-gray-400'}`}>
                          {set.right_score}
                        </span>
                      </div>
                      {isRope && set.duration_seconds && (
                        <span className="font-lexend text-xs text-gray-400 w-16 text-right">{set.duration_seconds}초</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}





          {/* 계주 순위 */}
          {isRelay && rankings.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="font-cafe24 text-sm font-bold text-gray-700">순위</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {rankings.map(rank => {
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={rank.team_id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-lexend font-bold text-lg w-8 text-center">
                          {medals[rank.rank_order - 1] || rank.rank_order}
                        </span>
                        <span className="font-cafe24 text-base text-gray-900">{getTeamName(rank.team_id)}</span>
                      </div>
                      {rank.record_value && (
                        <span className="font-lexend text-sm text-gray-500">{rank.record_value}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 경기 정보 */}
          <div className="flex flex-col gap-3 mt-2">
            {/* 위치 */}
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-gray-400 text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>location_on</span>
              <span className="font-cafe24 text-sm text-gray-600">{game.location || '장소 미정'}</span>
            </div>
            
            {/* 시간 */}
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-gray-400 text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>schedule</span>
              <span className="font-lexend text-sm text-gray-600">
                {formatTime(game.scheduled_start_time) || '시간 미정'}
                {formatTime(game.scheduled_end_time) && ` ~ ${formatTime(game.scheduled_end_time)}`}
              </span>
            </div>

            {/* 승자 */}
            {winnerText && (
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-pink-500 text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>emoji_events</span>
                <span className="font-cafe24 text-sm text-pink-600 font-bold">우승: {winnerText}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
