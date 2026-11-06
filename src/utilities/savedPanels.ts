export type PanelName = "chromatogram" | "ms1" | "ms2";

export type ShownPanels = Record<PanelName, boolean>;

export const panelNames: PanelName[] = ["chromatogram", "ms1", "ms2"];

const panelStore = "ion-beam.shownPanels";

const defaultPanels: ShownPanels = {
  chromatogram: true,
  ms1: false,
  ms2: false,
};

export function readPanels(): ShownPanels {
  try {
    const raw = localStorage.getItem(panelStore);
    if (!raw) return defaultPanels;
    const stored = JSON.parse(raw) as Partial<Record<PanelName, unknown>>;
    const panels = { ...defaultPanels };
    for (const name of panelNames) {
      if (typeof stored[name] === "boolean") panels[name] = stored[name];
    }
    return panels;
  } catch {
    return defaultPanels;
  }
}

export function writePanels(panels: ShownPanels): void {
  try {
    localStorage.setItem(panelStore, JSON.stringify(panels));
  } catch {
    return;
  }
}
