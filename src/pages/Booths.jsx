import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PageHeader from '../components/PageHeader';
import BoothCard from '../components/BoothCard';
import BoothDetail from './BoothDetail';

const BOOTH_GUIDE_OVERRIDES = [
  {
    match: (name) => name.includes('웨이트') || name.includes('데드리프트'),
    summary: '남자 100kg / 여자 60kg 성공 시 하리보, 남녀 랭킹 1~3위에게 배민 상품권!',
    guide: `🏋️ 웨이트 챌린지 (The Iron Will)
• 성공 기준: 남자 100kg / 여자 60kg 성공 시 하리보 젤리 증정!
• 랭킹 이벤트: 남/여 각 기록 1~3위에게는 배민 상품권 3만원권을 드립니다! (총 6명)
• 남녀 랭킹 1~3위가 속한 학번에게는 체육대회 전체 점수도 부여!`,
  },
  {
    match: (name) => name.includes('신발'),
    summary: '30점 이상이면 하리보, 만점자 중 추첨으로 스타벅스 상품권!',
    guide: `👟 신발 던지기
• 성공 기준: 과녁에 신발을 던져 30점 이상 획득 시 하리보 젤리 증정!
• 랭킹 이벤트: 만점자 중 추첨을 통해 스타벅스 상품권 1만원권을 드립니다! (총 10명)`,
  },
  {
    match: (name) => name.includes('페이스'),
    summary: '페이스페인팅 받고 인증샷 올리면 배민/스타벅스 경품 추첨!',
    guide: `📸 [SNS Event] 인증샷 찍고 팔로우!
아름다운 페이스페인팅 받고 추억도 남기세요! 🎨
• 방법: 페이스페인팅 후 체육대회 인증샷 찰칵! 📸 -> 혜윰 인스타 팔로우 + 태그해서 스토리 업로드!
• 경품: 추첨을 통해 배민 상품권 3만원(5명) & 스타벅스 1만원(10명) ☕️`,
  },
  {
    match: (name) => name.includes('물'),
    summary: '체육대회 열기를 식혀줄 시원한 물총 싸움 타임!',
    guide: `💦 시원하게 한 판! 물놀이 타임
체육대회 당일, 열기를 식혀줄 시원한 물총 싸움이 가능합니다! 🔫
• 학생회에서도 물총을 일부 구비해 두었으나, 수량이 넉넉하지 않아요! 😢
• 제대로 즐기고 싶은 학우분들은 개인 물총을 지참해 주시는 센스! 부탁드립니다. 🌊
뜨거운 열정과 즐거움이 가득할 이번 체육대회, 우리 모두 다치지 말고 신나게 즐겨봐요! 여러분의 많은 참여 부탁드립니다! 💙`,
  },
];

function applyGuideOverride(booth) {
  const name = String(booth?.name || '');
  const override = BOOTH_GUIDE_OVERRIDES.find((item) => item.match(name));
  return override ? { ...booth, summary: override.summary, guide: override.guide } : booth;
}

export default function Booths({ data, boothRankings }) {
  const booths = (data?.booths || []).map(applyGuideOverride);
  const boothSessions = data?.booth_sessions || [];
  const [selectedBooth, setSelectedBooth] = useState(null);

  const closeDetail = () => {
    setSelectedBooth(null);
    if (window.history.state?.modal === 'booth') {
      window.history.back();
    }
  };

  useEffect(() => {
    if (selectedBooth) {
      window.history.pushState({ modal: 'booth' }, '');
    }
  }, [selectedBooth]);

  useEffect(() => {
    const handlePopState = () => {
      if (selectedBooth) setSelectedBooth(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedBooth]);

  // 부스 이름에 따른 아이콘 자동 매칭
  // "mdi-" 접두사 → MDI 아이콘 | 그 외 → Material Symbols
  const getBoothIcon = (name) => {
    if (!name) return 'storefront';
    const n = name.toLowerCase();
    if (n.includes('우승') || n.includes('상금')) return 'mdi-trophy-award';
    if (n.includes('경품') || n.includes('미니게임')) return 'mdi-gift';
    if (n.includes('승부') || n.includes('예측')) return 'mdi-crystal-ball';
    if (n.includes('웨이트') || n.includes('weight')) return 'mdi-weight-lifter';
    if (n.includes('데드리프트') || n.includes('deadlift')) return 'mdi-dumbbell';
    if (n.includes('신발') || n.includes('shoe')) return 'mdi-shoe-sneaker';
    if (n.includes('경찰') || n.includes('도둑') || n.includes('cops')) return 'mdi-police-badge';
    if (n.includes('먹') || n.includes('음식') || n.includes('food') || n.includes('떡볶이') || n.includes('라면')) return 'mdi-food-drumstick';
    if (n.includes('음료') || n.includes('drink') || n.includes('카페') || n.includes('커피')) return 'mdi-coffee';
    if (n.includes('사진') || n.includes('포토') || n.includes('photo')) return 'mdi-camera';
    if (n.includes('노래') || n.includes('음악') || n.includes('music') || n.includes('노래방')) return 'mdi-microphone-variant';
    if (n.includes('게임') || n.includes('game') || n.includes('오락')) return 'mdi-gamepad-variant';
    if (n.includes('페이스') || n.includes('paint') || n.includes('타투')) return 'mdi-palette';
    if (n.includes('팔씨름') || n.includes('arm')) return 'mdi-arm-flex';
    if (n.includes('달리기') || n.includes('run') || n.includes('릴레이')) return 'mdi-run-fast';
    if (n.includes('던지') || n.includes('throw') || n.includes('투척')) return 'mdi-bullseye-arrow';
    if (n.includes('OX') || n.includes('퀴즈') || n.includes('quiz')) return 'mdi-head-question';
    if (n.includes('응원') || n.includes('cheer')) return 'mdi-party-popper';
    if (n.includes('물') || n.includes('water')) return 'mdi-water';
    if (n.includes('공포') || n.includes('귀신') || n.includes('horror')) return 'mdi-ghost';
    if (n.includes('미로') || n.includes('maze')) return 'mdi-map-marker-path';
    if (n.includes('사격') || n.includes('shoot')) return 'mdi-bullseye';
    return 'storefront';
  };

  // 부스별 세션 정보 계산
  const getSessionInfo = (boothId) => {
    const sessions = boothSessions
      .filter(s => s.booth_id === boothId)
      .sort((a, b) => (a.slot_order || 0) - (b.slot_order || 0));
    
    if (sessions.length === 0) return null;

    const current = sessions.find(s => s.session_status === 'open');
    const next = current
      ? sessions.find(s => s.slot_order > current.slot_order && s.session_status !== 'closed')
      : sessions.find(s => s.session_status === 'scheduled' || s.session_status === 'open');
    const allDone = sessions.every(s => s.session_status === 'closed');

    return { sessions, current, next, allDone };
  };

  // 시간 포맷팅 헬퍼
  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false
    }).format(new Date(isoStr));
  };

  // 상세 페이지 모드
  if (selectedBooth) {
    const sessionInfo = getSessionInfo(selectedBooth.id);
    return (
      <BoothDetail 
        booth={selectedBooth} 
        boothIcon={getBoothIcon(selectedBooth.name)} 
        sessionInfo={sessionInfo}
        formatTime={formatTime}
        onBack={closeDetail} 
      />
    );
  }

  return (
    <main className="w-full max-w-5xl mx-auto px-5 md:px-8 pt-8 md:pt-0 pb-32 md:pb-0 md:flex md:gap-12 md:h-[calc(100vh-64px)] md:overflow-hidden">
      {/* Left Panel */}
      <div className="md:w-[45%] md:flex md:flex-col md:items-center md:justify-center mb-8 md:mb-0">
        <div className="w-full max-w-[400px] xl:max-w-[450px]">
          <PageHeader title="부스 안내" />
        </div>
      </div>

      {/* Right Panel */}
      <div className="md:w-[55%] flex flex-col gap-4 w-full md:overflow-y-auto md:py-12 md:pl-1 md:pr-4 scrollbar-hide">
        {booths.length === 0 ? (
          <p className="text-center text-gray-400 font-cafe24">준비된 부스가 없습니다.</p>
        ) : (
          booths.map((booth, idx) => {
            const sessionInfo = getSessionInfo(booth.id);
            
            let timeStr = '상태 미상';
            if (sessionInfo) {
              if (sessionInfo.current) {
                timeStr = `${sessionInfo.current.title} 진행 중 · ${formatTime(sessionInfo.current.scheduled_start_time)} - ${formatTime(sessionInfo.current.scheduled_end_time)}`;
              } else if (sessionInfo.allDone) {
                timeStr = '운영 종료';
              } else if (sessionInfo.next) {
                timeStr = `다음 ${sessionInfo.next.title} · ${formatTime(sessionInfo.next.scheduled_start_time)}`;
              } else {
                timeStr = '준비 중';
              }
            } else {
              if (booth.status === 'in_progress') timeStr = '운영 중';
              else if (booth.status === 'scheduled') timeStr = '준비 중';
              else if (booth.status === 'completed') timeStr = '운영 종료';
              else if (booth.status === 'paused') timeStr = '일시 중지';
              else if (booth.status === 'cancelled') timeStr = '취소됨';
            }
            
            return (
              <motion.div
                key={booth.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, type: 'spring', stiffness: 250, damping: 20, delay: idx * 0.05 }}
              >
                <BoothCard 
                  title={booth.name}
                  location={booth.location || '위치 미정'}
                  time={timeStr}
                  icon={getBoothIcon(booth.name)}
                  onClick={() => setSelectedBooth(booth)}
                />
              </motion.div>
            )
          })
        )}
      </div>
    </main>
  )
}
