import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function BoothDetail({ booth, boothIcon, sessionInfo, formatTime, onBack }) {
  // 상세 페이지 진입 시 스크롤 맨 위로
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  if (!booth) return null;

  let statusText = '상태 미상';
  let statusColor = 'bg-gray-100 text-gray-600';
  
  // 세션이 있는 부스는 세션 상태 기반으로 표시
  if (sessionInfo) {
    if (sessionInfo.current) { statusText = `🟢 ${sessionInfo.current.title} 진행 중`; statusColor = 'bg-green-50 text-green-700'; }
    else if (sessionInfo.allDone) { statusText = '⚫ 운영 종료'; statusColor = 'bg-gray-100 text-gray-600'; }
    else if (sessionInfo.next) { statusText = `🕐 다음 ${sessionInfo.next.title} 예정`; statusColor = 'bg-yellow-50 text-yellow-700'; }
    else { statusText = '🕐 준비 중'; statusColor = 'bg-yellow-50 text-yellow-700'; }
  } else {
    if (booth.status === 'in_progress') { statusText = '🟢 운영 중'; statusColor = 'bg-green-50 text-green-700'; }
    else if (booth.status === 'scheduled') { statusText = '🕐 준비 중'; statusColor = 'bg-yellow-50 text-yellow-700'; }
    else if (booth.status === 'completed') { statusText = '⚫ 운영 종료'; statusColor = 'bg-gray-100 text-gray-600'; }
    else if (booth.status === 'paused') { statusText = '⏸️ 일시 중지'; statusColor = 'bg-orange-50 text-orange-600'; }
    else if (booth.status === 'cancelled') { statusText = '❌ 취소됨'; statusColor = 'bg-red-50 text-red-600'; }
  }

  // 세션 상태별 스타일
  const getSessionStyle = (session) => {
    if (session.session_status === 'open') return { bg: 'bg-green-50 border-green-300', dot: 'bg-green-500', text: 'text-green-700' };
    if (session.session_status === 'closed') return { bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-300', text: 'text-gray-400' };
    return { bg: 'bg-white border-gray-200', dot: 'bg-yellow-400', text: 'text-gray-600' };
  };

  return (
    <main 
      className="w-full max-w-5xl mx-auto px-5 md:px-8 pt-4 md:pt-0 pb-32 md:pb-0 md:flex md:gap-12 md:h-[calc(100vh-64px)] md:overflow-hidden"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      {/* Left Panel (Desktop) */}
      <div className="hidden md:flex md:w-[45%] md:flex-col md:items-center md:justify-center">
        <div className="w-full max-w-[400px] xl:max-w-[450px] flex flex-col items-center gap-8">
          {/* 큰 아이콘 */}
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-lg"
          >
            {(boothIcon || 'storefront').startsWith('mdi-') ? (
              <i className={`mdi ${boothIcon} text-[64px] text-white`}></i>
            ) : (
              <span className="material-symbols-outlined text-white text-[64px]" style={{fontVariationSettings: "'FILL' 1"}}>{boothIcon || 'storefront'}</span>
            )}
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="font-ginsaeng text-[3rem] lg:text-[4rem] font-black text-black text-center leading-tight"
          >
            {booth.name}
          </motion.h1>
        </div>
      </div>

      {/* Right Panel */}
      <div className="md:w-[55%] w-full md:overflow-y-auto md:py-12 md:pl-1 md:pr-4 scrollbar-hide">
        {/* Back button */}
        <motion.button 
          onClick={onBack}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors mb-6 group"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="font-cafe24 text-sm">부스 목록으로</span>
        </motion.button>

        {/* Mobile Title */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="md:hidden mb-6"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shadow-md">
              {(boothIcon || 'storefront').startsWith('mdi-') ? (
                <i className={`mdi ${boothIcon} text-[32px] text-white`}></i>
              ) : (
                <span className="material-symbols-outlined text-white text-[32px]" style={{fontVariationSettings: "'FILL' 1"}}>{boothIcon || 'storefront'}</span>
              )}
            </div>
            <div>
              <h1 className="font-cafe24 text-2xl font-black text-gray-900">{booth.name}</h1>
            </div>
          </div>
        </motion.div>

        {/* Info Card */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 250, damping: 20 }}
          className="bg-white rounded-[24px] p-6 shadow-[0px_10px_30px_-5px_rgba(0,0,0,0.05)] border border-gray-100 mb-4"
        >
          <h3 className="font-cafe24 text-lg font-bold text-gray-800 mb-4">부스 정보</h3>
          
          <div className="flex flex-col gap-4">
            {/* 상태 */}
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-gray-400 text-[20px]">info</span>
              <div className="flex flex-col">
                <span className="text-[12px] text-gray-400 font-lexend">상태</span>
                <span className={`inline-block w-fit px-3 py-1 rounded-full text-[13px] font-bold mt-1 ${statusColor}`}>{statusText}</span>
              </div>
            </div>

            {/* 위치 */}
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-gray-400 text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>location_on</span>
              <div className="flex flex-col">
                <span className="text-[12px] text-gray-400 font-lexend">위치</span>
                <span className="font-cafe24 text-base text-gray-800 mt-0.5">{booth.location || '위치 미정'}</span>
              </div>
            </div>

            {/* 요약 */}
            {booth.summary && (
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-gray-400 text-[20px] mt-0.5">description</span>
                <div className="flex flex-col">
                  <span className="text-[12px] text-gray-400 font-lexend">설명</span>
                  <span className="font-cafe24 text-base text-gray-800 mt-0.5 leading-relaxed">{booth.summary}</span>
                </div>
              </div>
            )}

            {booth.guide && (
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-gray-400 text-[20px] mt-0.5">campaign</span>
                <div className="flex flex-col">
                  <span className="text-[12px] text-gray-400 font-lexend">안내</span>
                  <span className="font-cafe24 text-base text-gray-800 mt-0.5 leading-relaxed whitespace-pre-line">{booth.guide}</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* 타임 스케줄 Card (세션이 있는 부스만) */}
        {sessionInfo && sessionInfo.sessions.length > 0 && (
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 250, damping: 20 }}
            className="bg-white rounded-[24px] p-6 shadow-[0px_10px_30px_-5px_rgba(0,0,0,0.05)] border border-gray-100 mb-4"
          >
            <h3 className="font-cafe24 text-lg font-bold text-gray-800 mb-4">타임 스케줄</h3>
            <div className="flex flex-col gap-2">
              {sessionInfo.sessions.map((session, sIdx) => {
                const style = getSessionStyle(session);
                const isCurrent = session.session_status === 'open';
                return (
                  <div 
                    key={sIdx}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${style.bg} ${isCurrent ? 'shadow-sm' : ''}`}
                  >
                    {/* 타임라인 도트 */}
                    <div className="relative flex items-center justify-center w-3">
                      <div className={`w-3 h-3 rounded-full ${style.dot}`} />
                      {isCurrent && (
                        <div className="absolute w-3 h-3 rounded-full bg-green-500 animate-ping" />
                      )}
                    </div>
                    {/* 타임 정보 */}
                    <div className="flex-1 flex items-center justify-between">
                      <span className={`font-cafe24 text-sm font-bold ${style.text}`}>
                        {session.title}
                        {isCurrent && <span className="ml-2 text-[11px] font-lexend font-normal">진행 중</span>}
                      </span>
                      <span className={`font-lexend text-xs ${style.text}`}>
                        {formatTime ? `${formatTime(session.scheduled_start_time)} - ${formatTime(session.scheduled_end_time)}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* 운영 시간 Card (세션이 없는 부스만) */}
        {!sessionInfo && (booth.scheduled_start_time || booth.scheduled_end_time) && (
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 250, damping: 20 }}
            className="bg-white rounded-[24px] p-6 shadow-[0px_10px_30px_-5px_rgba(0,0,0,0.05)] border border-gray-100"
          >
            <h3 className="font-cafe24 text-lg font-bold text-gray-800 mb-4">운영 시간</h3>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-gray-400 text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>schedule</span>
              <span className="font-lexend text-base text-gray-700">
                {booth.scheduled_start_time && new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(booth.scheduled_start_time))}
                {booth.scheduled_end_time && ` ~ ${new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(booth.scheduled_end_time))}`}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  )
}
