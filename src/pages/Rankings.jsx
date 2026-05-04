import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '../components/PageHeader';

export default function Rankings({ data, scoreboard }) {
  const teams = data?.teams || [];
  // get_scoreboard() 의 상세 데이터 (sources 포함) 우선 사용
  const rankings = scoreboard?.rankings || data?.scoreboard?.rankings || [];
  
  const [expandedTeam, setExpandedTeam] = useState(null);

  const getTeamName = (id) => {
    // get_scoreboard()는 team_name을 직접 포함
    const rank = rankings.find(r => r.team_id === id);
    if (rank?.team_name) return rank.team_name;
    return teams.find(t => t.id === id)?.name || '팀 미정';
  };

  const top1 = rankings[0];
  const top2 = rankings[1];
  const top3 = rankings[2];

  const toggleExpand = (teamId) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  // 순위별 메달 이모지
  const getMedal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  // 순위별 배경 색상
  const getRowStyle = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200';
    if (rank === 3) return 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200';
    return 'bg-white border-gray-100';
  };

  // source_type에 따른 아이콘
  const getSourceIcon = (type, title) => {
    if (type === 'game') return 'sports_score';
    if (type === 'ranking') return 'emoji_events';
    if (type === 'booth') return getBoothMdiIcon(title);
    return 'star';
  };

  // 부스 이름 → MDI 아이콘 매칭
  const getBoothMdiIcon = (name) => {
    if (!name) return 'storefront';
    const n = name.toLowerCase();
    if (n.includes('웨이트') || n.includes('weight')) return 'mdi-weight-lifter';
    if (n.includes('데드리프트') || n.includes('deadlift')) return 'mdi-dumbbell';
    if (n.includes('신발') || n.includes('shoe')) return 'mdi-shoe-sneaker';
    if (n.includes('경찰') || n.includes('도둑') || n.includes('cops')) return 'mdi-police-badge';
    if (n.includes('먹') || n.includes('음식') || n.includes('food')) return 'mdi-food-drumstick';
    if (n.includes('음료') || n.includes('drink') || n.includes('카페')) return 'mdi-coffee';
    if (n.includes('게임') || n.includes('game')) return 'mdi-gamepad-variant';
    if (n.includes('퀴즈') || n.includes('OX')) return 'mdi-head-question';
    return 'mdi-store';
  };

  const getSourceColor = (type) => {
    if (type === 'game') return 'text-pink-600 bg-pink-50';
    if (type === 'ranking') return 'text-purple-600 bg-purple-50';
    if (type === 'booth') return 'text-orange-600 bg-orange-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-5 md:px-8 pt-8 md:pt-0 pb-32 md:pb-0 md:flex md:gap-12 md:h-[calc(100vh-64px)] md:overflow-hidden">
      {/* Left Panel */}
      <div className="md:w-[45%] md:flex md:flex-col md:items-center md:justify-center mb-8 md:mb-0">
        <div className="w-full max-w-[400px] xl:max-w-[450px]">
          <PageHeader title="종합 순위" />
        </div>
      </div>

      {/* Right Panel */}
      <div className="md:w-[55%] w-full md:overflow-y-auto md:py-12 md:pl-1 md:pr-4 scrollbar-hide">
        {rankings.length === 0 ? (
          <p className="text-center text-gray-400 font-cafe24 mt-8">아직 집계된 순위가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Podium (Top 3) */}
            <div className="bg-white rounded-[24px] shadow-[0px_10px_30px_-5px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden mb-2">
              <div className="bg-gradient-to-br from-pink-50 to-white p-5 border-b border-gray-100 flex items-end justify-center gap-4 pt-8">
                {/* 2nd Place */}
                {top2 && (
                  <motion.div 
                    initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
                    className="flex flex-col items-center gap-2 relative top-4 cursor-pointer" onClick={() => toggleExpand(top2.team_id)}
                  >
                    <div className="w-16 h-16 rounded-full bg-gray-100 border-4 border-white shadow-sm flex items-center justify-center">
                      <span className="font-lexend font-bold text-xl text-gray-500">2</span>
                    </div>
                    <div className="text-center">
                      <p className="font-cafe24 text-base text-gray-900">{getTeamName(top2.team_id)}</p>
                      <p className="font-lexend text-sm text-pink-600 font-bold">{top2.total_points} pts</p>
                    </div>
                  </motion.div>
                )}
                
                {/* 1st Place */}
                {top1 && (
                  <motion.div 
                    initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}
                    className="flex flex-col items-center gap-2 relative -top-4 z-20 cursor-pointer" onClick={() => toggleExpand(top1.team_id)}
                  >
                    <div className="material-symbols-outlined text-yellow-400 absolute -top-8 text-3xl drop-shadow-md" style={{fontVariationSettings: "'FILL' 1"}}>workspace_premium</div>
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 border-4 border-white shadow-md flex items-center justify-center">
                      <span className="font-lexend font-bold text-2xl text-white">1</span>
                    </div>
                    <div className="text-center">
                      <p className="font-cafe24 text-lg text-gray-900">{getTeamName(top1.team_id)}</p>
                      <p className="font-lexend text-xl text-pink-600 font-bold">{top1.total_points} pts</p>
                    </div>
                  </motion.div>
                )}
                
                {/* 3rd Place */}
                {top3 && (
                  <motion.div 
                    initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
                    className="flex flex-col items-center gap-2 relative top-6 cursor-pointer" onClick={() => toggleExpand(top3.team_id)}
                  >
                    <div className="w-14 h-14 rounded-full bg-gray-100 border-4 border-white shadow-sm flex items-center justify-center">
                      <span className="font-lexend font-bold text-xl text-gray-500">3</span>
                    </div>
                    <div className="text-center">
                      <p className="font-cafe24 text-base text-gray-900">{getTeamName(top3.team_id)}</p>
                      <p className="font-lexend text-sm text-pink-600 font-bold">{top3.total_points} pts</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Full Rankings Table */}
            <div className="bg-white rounded-[24px] shadow-[0px_10px_30px_-5px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
              <div className="flex flex-col">
                {rankings.map((rank, idx) => {
                  const rankNum = rank.rank_order || idx + 1;
                  const medal = getMedal(rankNum);
                  const isExpanded = expandedTeam === rank.team_id;
                  const sources = rank.sources || [];

                  return (
                    <motion.div 
                      key={rank.team_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      {/* Row */}
                      <div 
                        onClick={() => toggleExpand(rank.team_id)}
                        className={`flex items-center justify-between py-4 px-5 border-b cursor-pointer transition-all duration-200 hover:bg-gray-50 active:scale-[0.99] ${getRowStyle(rankNum)} ${isExpanded ? 'bg-pink-50/50' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-lexend font-bold text-xl w-8 text-center" style={{ color: rankNum <= 3 ? '#111' : '#9ca3af' }}>
                            {medal || rankNum}
                          </span>
                          <span className="font-cafe24 text-lg text-gray-900">{getTeamName(rank.team_id)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-lexend font-bold ${rankNum <= 3 ? 'text-pink-600 text-lg' : 'text-gray-500 text-sm'}`}>
                            {rank.total_points} pts
                          </span>
                          <motion.span 
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="material-symbols-outlined text-gray-400 text-[20px]"
                          >
                            expand_more
                          </motion.span>
                        </div>
                      </div>

                      {/* Expandable Sources */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden border-b border-gray-100"
                          >
                            <div className="bg-gray-50/80 px-5 py-4">
                              {sources.length === 0 ? (
                                <p className="text-sm text-gray-400 font-cafe24 text-center py-2">아직 획득한 점수가 없습니다.</p>
                              ) : (
                                <div className="flex flex-col gap-2.5">
                                  <p className="text-[11px] text-gray-400 font-lexend uppercase tracking-wider mb-1">점수 내역</p>
                                  {sources.map((src, sIdx) => (
                                    <div key={sIdx} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getSourceColor(src.source_type)}`}>
                                          {getSourceIcon(src.source_type, src.source_title).startsWith('mdi-') ? (
                                            <i className={`mdi ${getSourceIcon(src.source_type, src.source_title)} text-[16px]`}></i>
                                          ) : (
                                            <span className="material-symbols-outlined text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>{getSourceIcon(src.source_type, src.source_title)}</span>
                                          )}
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="font-cafe24 text-sm text-gray-800">{src.source_title || src.reason || '점수'}</span>
                                          {src.reason && src.source_title && (
                                            <span className="text-[11px] text-gray-400 font-lexend">{src.reason}</span>
                                          )}
                                        </div>
                                      </div>
                                      <span className="font-lexend font-bold text-pink-600 text-sm">+{src.points}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
