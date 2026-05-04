import React, { useState, useEffect } from 'react';

export default function PageHeader({ title, subtitle, date }) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    // 모바일(768px 미만)에서만 스크롤 감지
    if (window.innerWidth >= 768) return;
    
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Desktop(md 이상): 모든 크기를 vh(뷰포트 높이) 기반으로 → 창 높이에 비례하여 대문 전체가 함께 축소/확대
  // Mobile: 기존 고정 크기 유지
  const desktopStyles = {
    image: { height: 'clamp(120px, 30vh, 400px)' },            // 로고 높이: 뷰포트 높이의 30%
    title: { fontSize: 'clamp(1.8rem, 5.5vh, 4.5rem)' },       // 제목 폰트: 뷰포트 높이의 5.5%
    subtitle: { fontSize: 'clamp(0.8rem, 1.8vh, 1.2rem)' },    // 부제 폰트
    date: { fontSize: 'clamp(0.9rem, 2vh, 1.5rem)' },          // 날짜 폰트
    icon: { fontSize: 'clamp(0.9rem, 2vh, 1.5rem)' },          // 아이콘
    gap: { marginBottom: 'clamp(12px, 2.5vh, 40px)' },         // 로고↔제목 간격
    dateGap: { marginTop: 'clamp(8px, 1.5vh, 24px)' },         // 제목↔날짜 간격
  };

  // 모바일 스크롤에 따른 트랜지션 처리 (0~100px 구간)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const progress = isMobile ? Math.min(scrollY / 100, 1) : 0;
  const opacity = 1 - progress;
  const scale = 1 - (progress * 0.2); // 1 -> 0.8

  return (
    <div 
      className="flex flex-col items-center justify-center pt-2 pb-4 w-full origin-top"
      style={isMobile ? { opacity, transform: `scale(${scale})`, willChange: 'opacity, transform' } : {}}
    >
      {/* 로고 이미지 */}
      <div className="gate-logo-wrap w-4/5 max-w-[345px] aspect-[1.54] relative mb-6 flex justify-center md:w-full md:max-w-none md:aspect-auto">
        <img 
          alt="Medalist 2026 Sports Festival Logo" 
          className="gate-logo w-full h-full object-contain drop-shadow-lg md:w-auto" 
          style={{ height: undefined }}
          src="https://lh3.googleusercontent.com/aida/ADBb0uhmwCYQPn7Vku15jRDlmvR8snwBwpcjqnBhK9iuY8m772rYO4xAd_nLYFHO2-gs-59OWb7YzfX10--4VwNMzlIBOEy5-m-TUEA4kcnuXfEGq-R7OmiEEccql12DPj-tGwzeMLcK4ULvJ4hJf3jXoLdL4OakAT4aNYfVUCpKKIM4NHKjBwytDg4o4bdBnvwYRRUP-VWbigBf4k0mi6XKgy0h8y5RICJBAV2oqf12H9kEOfwDXs3GNj_Ww71L_xNhyfmhajrw9OReJg"
        />
        {/* 데스크톱 전용: vh 기반 높이 오버라이드 */}
        <style>{`
          @media (min-width: 768px) {
            .gate-logo { height: ${desktopStyles.image.height} !important; width: auto !important; }
            .gate-logo-wrap { margin-bottom: ${desktopStyles.gap.marginBottom} !important; }
            .gate-title { font-size: ${desktopStyles.title.fontSize} !important; line-height: 1.2 !important; }
            .gate-subtitle { font-size: ${desktopStyles.subtitle.fontSize} !important; margin-top: ${desktopStyles.dateGap.marginTop} !important; }
            .gate-date-wrap { margin-top: ${desktopStyles.dateGap.marginTop} !important; }
            .gate-date-icon { font-size: ${desktopStyles.icon.fontSize} !important; }
            .gate-date-text { font-size: ${desktopStyles.date.fontSize} !important; }
          }
        `}</style>
      </div>

      {/* 제목 */}
      <div className="gate-title font-ginsaeng text-3xl font-black drop-shadow-sm text-black text-center whitespace-nowrap">{title}</div>

      {/* 부제 */}
      {subtitle && <p className="gate-subtitle text-[14px] text-gray-500 text-center font-cafe24 mt-2">{subtitle}</p>}

      {/* 날짜 */}
      {date && (
        <div className="gate-date-wrap flex items-center gap-2 justify-center mt-4">
          <span className="gate-date-icon material-symbols-outlined text-pink-400 text-base" style={{fontVariationSettings: "'FILL' 1"}}>grade</span>
          <span className="gate-date-text font-lexend font-bold text-lg text-gray-800 tracking-wider">{date}</span>
          <span className="gate-date-icon material-symbols-outlined text-orange-400 text-base" style={{fontVariationSettings: "'FILL' 1"}}>grade</span>
        </div>
      )}
    </div>
  )
}
