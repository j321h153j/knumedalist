import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_CARD_GRADIENT = 'from-pink-500 to-rose-600';
const CARD_COLOR_PRESETS = {
  'from-pink-500 to-rose-500': 'from-pink-500 to-rose-500',
  'from-orange-400 to-amber-500': 'from-orange-400 to-amber-500',
  'from-teal-400 to-emerald-500': 'from-teal-400 to-emerald-500',
};

function getCardColorPreset(colorPreset) {
  const value = String(colorPreset || '').trim();
  if (!value) return DEFAULT_CARD_GRADIENT;
  return CARD_COLOR_PRESETS[value] || value;
}

export default function Info({ cardNews }) {
  const [selectedMapPin, setSelectedMapPin] = useState(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);

  const closeMap = () => {
    setIsMapOpen(false);
    if (window.history.state?.modal === 'map') {
      window.history.back();
    }
  };

  const closeCard = () => {
    setSelectedCard(null);
    setCurrentImgIdx(0);
    setTouchStartX(null);
    setTouchEndX(null);
    if (window.history.state?.modal === 'card') {
      window.history.back();
    }
  };

  // 모달 뒤로가기 제어
  useEffect(() => {
    if (isMapOpen) window.history.pushState({ modal: 'map' }, '');
    if (selectedCard) window.history.pushState({ modal: 'card' }, '');
  }, [isMapOpen, selectedCard]);

  useEffect(() => {
    const handlePopState = () => {
      if (isMapOpen) setIsMapOpen(false);
      if (selectedCard) {
        setSelectedCard(null);
        setCurrentImgIdx(0);
        setTouchStartX(null);
        setTouchEndX(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMapOpen, selectedCard]);

  const handleTouchStart = (e) => {
    e.stopPropagation(); // 상위 App.jsx의 탭 전환 스와이프 방지
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    e.stopPropagation(); // 상위 App.jsx의 탭 전환 스와이프 방지
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    e.stopPropagation(); // 상위 App.jsx의 탭 전환 스와이프 방지
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      if (currentImgIdx < (selectedCard.image_urls?.length || 0) - 1) {
        setCurrentImgIdx(prev => prev + 1);
      } else {
        closeCard();
      }
    } else if (isRightSwipe) {
      if (currentImgIdx > 0) {
        setCurrentImgIdx(prev => prev - 1);
      }
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  // 지도 주요 스팟
  const mapSpots = [
    { id: 'hq', name: '본부석 & 의료진', x: '50%', y: '80%', icon: 'tour' },
    { id: 'futsal', name: '풋살장', x: '20%', y: '30%', icon: 'sports_soccer' },
    { id: 'gym', name: '실내체육관', x: '80%', y: '40%', icon: 'sports_basketball' },
    { id: 'booth', name: '먹거리 부스', x: '60%', y: '65%', icon: 'storefront' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="px-5 pt-8 pb-4">
        <h1 className="font-cafe24 text-3xl font-bold text-gray-900 mb-1">안내 및 지도</h1>
        <p className="font-lexend text-sm text-gray-500">행운제를 200% 즐기기 위한 모든 정보</p>
      </div>

      {/* 지도 섹션 */}
      <section className="px-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-cafe24 text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-pink-500 text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>map</span>
            캠퍼스 맵
          </h2>
        </div>
        
        <div 
          onClick={() => setIsMapOpen(true)}
          className="relative w-full bg-white rounded-3xl border border-gray-100 shadow-[0px_5px_15px_rgba(0,0,0,0.03)] overflow-hidden cursor-zoom-in active:scale-[0.98] transition-transform"
        >
          <img 
            src="/map.jpg" 
            alt="캠퍼스 맵" 
            className="w-full h-auto"
          />
          <div className="absolute bottom-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center text-gray-600">
            <span className="material-symbols-outlined text-xl">zoom_in</span>
          </div>
        </div>
      </section>

      {/* 카드뉴스 섹션 */}
      <section>
        <div className="px-5 mb-4">
          <h2 className="font-cafe24 text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-pink-500 text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>view_carousel</span>
            행운제 가이드
          </h2>
        </div>
        
        <div className="flex flex-col gap-4 px-5 pb-12">
          {cardNews && cardNews.length > 0 ? (
            cardNews.map((card, idx) => {
              const colorPreset = getCardColorPreset(card.color_preset);
              const isLight = colorPreset && (
                colorPreset.includes('white') ||
                colorPreset.includes('gray-50') ||
                colorPreset.includes('gray-100') ||
                colorPreset.includes('slate-50') ||
                colorPreset.includes('zinc-50')
              );
              
              const textColor = isLight ? 'text-gray-900' : 'text-white';
              const textMutedColor = isLight ? 'text-gray-500' : 'text-white/80';
              const badgeBg = isLight ? 'bg-gray-100' : 'bg-black/10';
              const badgeText = isLight ? 'text-gray-600' : 'text-white';

              return (
                <motion.div 
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedCard(card)}
                  className={`w-full rounded-[28px] border border-gray-100/50 bg-white bg-gradient-to-br ${colorPreset} p-6 flex items-center shadow-[0_15px_30px_-10px_rgba(0,0,0,0.1)] relative overflow-hidden cursor-pointer group`}
                >
                  {/* Decorative Background Shapes */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/5 rounded-full blur-2xl" />

                  <div className="flex-1 z-10 pr-4">
                    <div className={`${badgeBg} backdrop-blur-md w-fit px-3 py-1 rounded-full mb-3 border border-white/10`}>
                      <span className={`${badgeText} text-[11px] font-black tracking-wider uppercase`}>{card.category || 'NOTICE'}</span>
                    </div>
                    <h3 className={`font-cafe24 text-[22px] font-black ${textColor} leading-tight mb-2 break-keep drop-shadow-sm`}>
                      {card.title}
                    </h3>
                    {card.content && (
                      <p className={`font-lexend ${textMutedColor} text-[13px] leading-relaxed break-keep font-medium`}>
                        {card.content}
                      </p>
                    )}
                  </div>

                  <div className={`w-16 h-16 shrink-0 rounded-2xl ${isLight ? 'bg-gray-100' : 'bg-white/15'} backdrop-blur-xl border border-white/20 flex items-center justify-center z-10 shadow-inner group-hover:rotate-12 transition-transform duration-300`}>
                    <span className={`material-symbols-outlined text-[32px] ${isLight ? 'text-gray-400' : 'text-white'}`} style={{fontVariationSettings: "'FILL' 1"}}>
                      {card.icon_name || 'campaign'}
                    </span>
                  </div>

                  {/* Subtle Progress Indicator or Interaction Hint */}
                  <div className={`absolute bottom-0 left-0 h-1 ${isLight ? 'bg-gray-200' : 'bg-white/30'} w-0 group-hover:w-full transition-all duration-700`} />
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-10 text-gray-400 font-lexend text-sm">
              준비된 카드뉴스가 없습니다.
            </div>
          )}
        </div>
      </section>

      {/* 개발자 크레딧 섹션 */}
      <section className="px-5 pt-8 pb-16">
        <div className="relative overflow-hidden rounded-[32px] bg-white border border-gray-100 p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-50 to-orange-50 opacity-50 rounded-bl-full -z-0" />
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-pink-500" style={{fontVariationSettings: "'FILL' 1"}}>code</span>
            </div>
            
            <p className="text-[10px] font-black text-pink-400 uppercase tracking-[0.2em] mb-2">Developed with Passion</p>
            <h3 className="font-cafe24 text-xl font-black text-gray-900 mb-1">22학번 조현진</h3>
            <p className="font-lexend text-[11px] text-gray-400 mb-6">Development Period: 2026.05.01 ~ 05.06</p>
            
            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent mb-6" />
            
            <p className="font-cafe24 text-[14px] text-gray-600 leading-relaxed italic">
              "첫 애플리케이션 개발! 뿌듯합니다.<br/>모두 재밌는 운동회 보내시길 바랍니다! ✨"
            </p>
          </div>
        </div>
        <p className="mt-8 text-center text-[10px] text-gray-300 font-lexend tracking-widest uppercase">
          © 2026 KNUME Athletic Festival. All rights reserved.
        </p>
      </section>

      {/* 지도 크게 보기 모달 */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex flex-col"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 헤더 */}
            <div className="flex justify-between items-center p-4">
              <span className="text-white/80 font-lexend text-sm">캠퍼스 맵 확대보기</span>
              <button 
                onClick={closeMap}
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            {/* 맵 이미지 컨테이너 (터치 스크롤 가능) */}
            <div 
              className="flex-1 overflow-auto flex items-center justify-center p-2"
              onClick={closeMap} // 배경 누르면 닫기
            >
              <motion.img 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                src="/map.jpg" 
                alt="캠퍼스 맵 상세" 
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl touch-pan-x touch-pan-y"
                onClick={(e) => e.stopPropagation()} // 이미지 누를 땐 안 닫히게
              />
            </div>
            
            {/* 안내 텍스트 */}
            <div className="p-6 text-center text-white/50 text-xs font-lexend pointer-events-none">
              두 손가락으로 확대/축소할 수 있습니다.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 카드뉴스 상세 모달 (이미지 뷰어) */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black flex flex-col"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* 상단바 */}
            <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-md absolute top-0 left-0 w-full z-20">
              <div className="flex flex-col">
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{selectedCard.category}</span>
                <h3 className="text-white font-cafe24 text-sm truncate max-w-[200px]">{selectedCard.title}</h3>
              </div>
              <button 
                onClick={closeCard}
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* 이미지 컨텐츠 */}
            <div className="flex-1 relative flex items-center justify-center bg-zinc-900 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImgIdx}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.2 }}
                  src={selectedCard.image_urls[currentImgIdx]}
                  alt={`카드뉴스 ${currentImgIdx + 1}`}
                  className="max-w-full max-h-full object-contain shadow-2xl pointer-events-none"
                />
              </AnimatePresence>

              {/* 페이지 표시기 */}
              <div className="absolute bottom-10 left-0 w-full flex justify-center gap-1.5 z-20">
                {selectedCard.image_urls?.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImgIdx ? 'w-6 bg-pink-500' : 'w-1.5 bg-white/30'}`}
                  />
                ))}
              </div>

              {/* 가이드 안내 */}
              <div className="absolute bottom-4 left-0 w-full text-center text-white/30 text-[10px] font-lexend pointer-events-none">
                왼쪽으로 스와이프하면 다음 페이지로 넘어갑니다.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
