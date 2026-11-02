"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export function useSegmentedGlider(activeKey: string) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLElement | null>>({});
  const [glider, setGlider] = useState({
    left: 0,
    width: 0,
    visible: false,
    ready: false,
  });

  const updateGlider = useCallback(() => {
    const tab = tabRefs.current[activeKey];
    if (!tab || tab.offsetWidth === 0) {
      setGlider((previous) =>
        previous.ready && !previous.visible
          ? previous
          : { ...previous, visible: false, ready: true }
      );
      return;
    }

    const left = tab.offsetLeft;
    const width = tab.offsetWidth;
    setGlider((previous) =>
      previous.ready && previous.visible && previous.left === left && previous.width === width
        ? previous
        : { left, width, visible: true, ready: true }
    );
  }, [activeKey]);

  useLayoutEffect(() => {
    updateGlider();
  }, [updateGlider]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const observer = new ResizeObserver(updateGlider);
    observer.observe(track);
    for (const tab of Object.values(tabRefs.current)) {
      if (tab) observer.observe(tab);
    }

    return () => observer.disconnect();
  }, [updateGlider]);

  return { trackRef, tabRefs, glider };
}
