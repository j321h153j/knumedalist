import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
        
        <div className="flex flex-col gap-4 px-5 pb-8">
          {cardNews && cardNews.length > 0 ? (
            cardNews.map((card) => (
              <motion.div 
                key={card.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedCard(card)}
                className={`w-full rounded-2xl bg-gradient-to-r ${card.color_preset || 'from-pink-500 to-rose-500'} p-5 flex items-center shadow-md relative overflow-hidden cursor-pointer`}
              >
                <div className="flex-1 z-10 pr-2">
                  <div className="bg-white/20 backdrop-blur-sm w-fit px-2.5 py-0.5 rounded-full mb-2.5">
                    <span className="text-white text-[10px] font-bold tracking-wide">{card.category}</span>
                  </div>
                  <h3 className="font-cafe24 text-[17px] font-bold text-white leading-snug mb-1.5 break-keep">
                    {card.title}
                  </h3>
                  {card.content && (
                    <p className="font-lexend text-white/90 text-[12px] leading-relaxed break-keep">
                      {card.content}
                    </p>
                  )}
                </div>

                <div className="w-14 h-14 shrink-0 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center z-10">
                  <span className="material-symbols-outlined text-[28px] text-white" style={{fontVariationSettings: "'FILL' 1"}}>
                    {card.icon_name || 'campaign'}
                  </span>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-10 text-gray-400 font-lexend text-sm">
              준비된 카드뉴스가 없습니다.
            </div>
          )}
        </div>
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
