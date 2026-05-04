import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Info() {
  const [selectedMapPin, setSelectedMapPin] = useState(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const closeMap = () => {
    setIsMapOpen(false);
    if (window.history.state?.modal === 'map') {
      window.history.back();
    }
  };

  // 모달 뒤로가기 및 ESC 닫기 제어
  useEffect(() => {
    if (isMapOpen) {
      window.history.pushState({ modal: 'map' }, '');
    }
  }, [isMapOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (isMapOpen) setIsMapOpen(false);
    };
    const handleKeyDown = (e) => { 
      if (e.key === 'Escape' && isMapOpen) closeMap(); 
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMapOpen]);

  // 카드뉴스 데이터 (임시 가이드라인)
  const cardNews = [
    {
      id: 1,
      category: "필독",
      title: "이번 대회, 꼭 알아야 할 핵심 룰! 📝",
      content: "모든 종목의 예선전은 단판승부로 진행되며, 무승부 시 연장전 없이 득실차를 따집니다.",
      color: "from-pink-500 to-rose-500",
      icon: "campaign"
    },
    {
      id: 2,
      category: "이벤트",
      title: "스탬프 투어 100% 활용법 🏃‍♂️",
      content: "각 부스를 체험하고 스탬프를 3개 모아오시면, 본부석에서 시원한 아이스티로 교환해 드립니다!",
      color: "from-orange-400 to-amber-500",
      icon: "local_cafe"
    },
    {
      id: 3,
      category: "우승상품",
      title: "종합 우승 학과를 위한 특별한 보상 🏆",
      content: "이번 행운제 종합 우승 학과에게는 학과 지원금 50만원과 우승 트로피가 수여됩니다.",
      color: "from-blue-500 to-indigo-500",
      icon: "workspace_premium"
    },
    {
      id: 4,
      category: "안전",
      title: "다쳤을 때는 어떻게 하나요? 🏥",
      content: "본부석 바로 옆에 의료진이 대기 중입니다. 찰과상 등 부상이 발생하면 즉시 의료 부스를 방문해주세요.",
      color: "from-teal-400 to-emerald-500",
      icon: "medical_services"
    }
  ];

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
          {/* 돋보기 아이콘 오버레이 */}
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
        
        {/* 세로형 리스트 (가로로 긴 카드) */}
        <div className="flex flex-col gap-4 px-5 pb-8">
          {cardNews.map((card) => (
            <motion.div 
              key={card.id}
              whileTap={{ scale: 0.98 }}
              className={`w-full rounded-2xl bg-gradient-to-r ${card.color} p-5 flex items-center shadow-md relative overflow-hidden`}
            >


              <div className="flex-1 z-10 pr-2">
                <div className="bg-white/20 backdrop-blur-sm w-fit px-2.5 py-0.5 rounded-full mb-2.5">
                  <span className="text-white text-[10px] font-bold tracking-wide">{card.category}</span>
                </div>
                <h3 className="font-cafe24 text-[17px] font-bold text-white leading-snug mb-1.5 break-keep">
                  {card.title}
                </h3>
                <p className="font-lexend text-white/90 text-[12px] leading-relaxed break-keep">
                  {card.content}
                </p>
              </div>

              <div className="w-14 h-14 shrink-0 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center z-10">
                <span className="material-symbols-outlined text-[28px] text-white" style={{fontVariationSettings: "'FILL' 1"}}>
                  {card.icon}
                </span>
              </div>
            </motion.div>
          ))}
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

    </div>
  );
}
