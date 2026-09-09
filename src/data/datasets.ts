import { compounds, type Compound } from "./compounds";
import { timeRange } from "./targets";

export interface Dataset {
  id: string;
  label: string;
  folders: string[];
  rtRange: { from: number; to: number };
  file?: string;
  list?: Compound[];
}

export const defaultDataset: Dataset = {
  id: "amino-acids",
  label: "Amino acids",
  folders: [],
  rtRange: timeRange,
  list: compounds,
};

export const datasets: Dataset[] = [
  {
    id: "qehc",
    label: "Q Exactive HF truth set",
    folders: [
      "https://drive.google.com/drive/folders/1532fGlCS_KzmPF6i0jXiJSD6W4PYbgtt",
    ],
    rtRange: { from: 0, to: 35 },
    file: "truth-qehc.tsv",
  },
  {
    id: "ttof",
    label: "TripleTOF 6600 truth set",
    folders: [
      "https://drive.google.com/drive/folders/1K-Vq1sMZrbsUib3gts0lv3v2c7wow2Y0",
    ],
    rtRange: { from: 0, to: 35 },
    file: "truth-ttof.tsv",
  },
];

export function findDataset(path: string): Dataset {
  const clean = path.trim();
  if (clean.length === 0) return defaultDataset;
  for (const dataset of datasets) {
    if (dataset.folders.some((folder) => clean.startsWith(folder))) return dataset;
  }
  return defaultDataset;
}

export function toDatasetUrl(file: string): string {
  return `${import.meta.env.BASE_URL}${file}`;
}
