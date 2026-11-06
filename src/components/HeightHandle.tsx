import { shortestPlot, tallestChosenPlot } from "../utilities/plotSize";

interface HeightHandleProps {
  height: number;
  onResize: (height: number) => void;
  onReset: () => void;
}

function clampHeight(height: number): number {
  return Math.min(tallestChosenPlot, Math.max(shortestPlot, Math.round(height)));
}

export function HeightHandle({ height, onResize, onReset }: HeightHandleProps) {
  function start(startY: number) {
    document.body.classList.add("resizing-rows");

    function move(event: MouseEvent) {
      onResize(clampHeight(height + event.clientY - startY));
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
