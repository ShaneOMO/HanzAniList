export type SourceType = "official" | "community" | "ai";

export interface TitleRecord {
  t: string;
  a: string[];
  s: SourceType;
  n?: string;
  u?: string;
}

export interface Settings {
  uiTranslation: boolean;
  titleTranslation: boolean;
  showOriginal: boolean;
  aiTranslations: boolean;
}

export const defaultSettings: Settings = {
  uiTranslation: true,
  titleTranslation: true,
  showOriginal: false,
  aiTranslations: true,
};
