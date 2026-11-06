import { useEffect, useRef, useState, type RefObject } from "react";

const tallestPlot = 460;
export const shortestPlot = 150;
export const tallestChosenPlot = 1200;
const minWidth = 280;
const shareOfWidth = 0.55;
const shareOfScreen = 0.52;

function readPlotHeight(width: number, screenHeight: number): number {
  const fromWidth = Math.round(width * shareOfWidth);
  const fromScreen = Math.round(screenHeight * shareOfScreen);
  const wanted = Math.min(fromWidth, fromScreen);
  if (wanted > tallestPlot) return tallestPlot;
  if (wanted < shortestPlot) return shortestPlot;
  return wanted;
}

function useScreenHeight(): number {
  const [height, setHeight] = useState(() => globalThis.innerHeight || 800);

  useEffect(() => {
    const update = () => setHeight(globalThis.innerHeight);
    globalThis.addEventListener("resize", update);
    return () => globalThis.removeEventListener("resize", update);
  }, []);

  return height;
}

export interface PlotSize {
  wrap: RefObject<HTMLDivElement | null>;
  width: number;
  height: number;
}

export function usePlotSize(shareOfHeight = 1, chosenHeight: number | null = null): PlotSize {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const screenHeight = useScreenHeight();

  useEffect(() => {
    const node = wrap.current;
    if (!node) return undefined;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (measured) setWidth(Math.max(minWidth, Math.floor(measured)));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const height = chosenHeight ?? Math.max(shortestPlot, Math.round(readPlotHeight(width, screenHeight) * shareOfHeight));
  return { wrap, width, height };
}
