import type { RefObject } from "react";
import { toLayoutPx } from "../utilities/uiZoom";
import { shortestPlot, tallestChosenPlot } from "../utilities/plotSize";

interface HeightHandleProps {
  height: number;
  onResize: (height: number) => void;
  onReset: () => void;
  measure?: RefObject<HTMLElement | null>;
}

function clampHeight(height: number): number {
  return Math.min(tallestChosenPlot, Math.max(shortestPlot, Math.round(height)));
}

export function HeightHandle({ height, onResize, onReset, measure }: HeightHandleProps) {
  function start(startY: number) {
    const node = measure?.current;
    const startHeight = node ? toLayoutPx(node.getBoundingClientRect().height) : height;
    document.body.classList.add("resizing-rows");

    function move(event: MouseEvent) {
      const moved = toLayoutPx(event.clientY - startY);
      onResize(clampHeight(startHeight + moved));
    }

    function stop() {
      document.body.classList.remove("resizing-rows");
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
    }

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
  }

  return (
    <div
      className="height-handle"
      title="Drag to change the height, double-click to reset"
      onMouseDown={(event) => {
        event.preventDefault();
        start(event.clientY);
      }}
      onDoubleClick={onReset}
    />
  );
}
