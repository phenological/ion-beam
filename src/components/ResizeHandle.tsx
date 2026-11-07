import { toLayoutPx } from "../utilities/uiZoom";

interface ResizeHandleProps {
  onResize: (cursorX: number) => void;
}

export function ResizeHandle({ onResize }: ResizeHandleProps) {
  function start() {
    document.body.classList.add("resizing");

    function move(event: MouseEvent) {
      onResize(toLayoutPx(event.clientX));
    }

    function stop() {
      document.body.classList.remove("resizing");
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
    }

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
  }

  return (
    <div
      className="resize-handle"
      onMouseDown={(event) => {
        event.preventDefault();
        start();
      }}
    />
  );
}
