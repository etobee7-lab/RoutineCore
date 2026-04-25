import React, { useEffect, useRef } from 'react';

function ScrollPicker({ options, value, onChange, unit }) {
  const scrollRef = useRef(null);
  const itemHeight = 28; // [남개발 부장] 항목 높이
  const extendedOptions = [...options, ...options, ...options]; // 3배 확장하여 루프 구현
  const middleStart = options.length;

  // 초기 위치 설정 (중앙 섹션의 선택된 값으로)
  useEffect(() => {
    if (scrollRef.current) {
      const valInt = parseInt(value);
      const roundedVal = String(Math.round(valInt / 5) * 5 % 60).padStart(2, '0');
      let selectedIndex = options.indexOf(value);
      if (selectedIndex === -1) selectedIndex = options.indexOf(roundedVal);
      if (selectedIndex === -1) selectedIndex = 0;

      scrollRef.current.scrollTop = (middleStart + selectedIndex) * itemHeight;
    }
  }, []);

  // 외부에서 value가 바뀔 때 (수정 모드 등) 대응
  useEffect(() => {
    if (scrollRef.current) {
      const currentScrollTop = scrollRef.current.scrollTop;
      const currentIndex = Math.round(currentScrollTop / itemHeight) % options.length;

      const valInt = parseInt(value);
      const roundedVal = String(Math.round(valInt / 5) * 5 % 60).padStart(2, '0');
      let targetIndex = options.indexOf(value);
      if (targetIndex === -1) targetIndex = options.indexOf(roundedVal);
      if (targetIndex === -1) targetIndex = 0;

      if (currentIndex !== targetIndex) {
        const currentSegment = Math.floor(currentScrollTop / (options.length * itemHeight));
        scrollRef.current.scrollTop = (currentSegment * options.length + targetIndex) * itemHeight;
      }
    }
  }, [value, options]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop } = scrollRef.current;

    const totalHeight = options.length * itemHeight;
    if (scrollTop < itemHeight) {
      scrollRef.current.scrollTop = scrollTop + totalHeight;
      return;
    } else if (scrollTop > totalHeight * 2 - itemHeight) {
      scrollRef.current.scrollTop = scrollTop - totalHeight;
      return;
    }

    const index = Math.round(scrollTop / itemHeight) % options.length;
    const selectedValue = options[index];

    const valInt = parseInt(value);
    const roundedVal = String(Math.round(valInt / 5) * 5 % 60).padStart(2, '0');

    if (selectedValue && selectedValue !== value && selectedValue !== roundedVal) {
      onChange(selectedValue);
    }
  };

  const handleClick = (idx) => {
    if (!scrollRef.current) return;
    const actualIdx = idx % options.length;
    const currentScrollTop = scrollRef.current.scrollTop;
    const currentSegment = Math.floor(currentScrollTop / (options.length * itemHeight));
    scrollRef.current.scrollTo({ top: (currentSegment * options.length + actualIdx) * itemHeight, behavior: 'smooth' });
  };

  return (
    <div className="picker-column">
      <div className="picker-scroll-container" ref={scrollRef} onScroll={handleScroll}>
        <div className="picker-padding-top" style={{ height: '28px' }} />
        {extendedOptions.map((opt, idx) => {
          const isStandard = options.includes(opt);
          const isActive = value === opt;
          return (
            <div
              key={`${opt}-${idx}`}
              className={`picker-item ${isActive ? 'active' : ''} ${!isStandard ? 'precision-mode' : ''}`}
              onClick={() => handleClick(idx)}
              style={!isStandard && isActive ? { color: '#fbbf24', fontWeight: 'bold' } : {}}
            >
              {opt}{isActive && !isStandard ? '★' : unit}
            </div>
          );
        })}
        <div className="picker-padding-bottom" style={{ height: '28px' }} />
      </div>
      <div className="picker-selection-overlay" />
    </div>
  );
}

export default ScrollPicker;
