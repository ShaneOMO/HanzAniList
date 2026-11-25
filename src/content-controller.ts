import type { Settings, TitleRecord } from "./types";
import type { TitleProvider } from "./title-provider";
import { applyTitle, findTitleTargets } from "./title-renderer";
import { translateTree } from "./ui-translator";

export class ContentController {
  private readonly pending = new Set<ParentNode>();
  private frame?: number;

  constructor(
    private readonly settings: Settings,
    private readonly titles: TitleProvider,
    private readonly window: Window,
  ) {}

  start(): void {
    this.process(this.window.document);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          if (mutation.target.parentElement) this.schedule(mutation.target.parentElement);
          continue;
        }
        if (mutation.type === "attributes") {
          this.schedule(mutation.target as Element);
          continue;
        }
        for (const node of mutation.addedNodes) {
          if (node instanceof Element || node instanceof DocumentFragment) this.schedule(node);
          else if (node instanceof Text && node.parentElement) this.schedule(node.parentElement);
        }
      }
    });
    observer.observe(this.window.document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "aria-label"],
    });
  }

  schedule(root: ParentNode): void {
    this.pending.add(root);
    if (this.frame !== undefined) return;
    this.frame = this.window.requestAnimationFrame(() => {
      this.frame = undefined;
      const batch = [...this.pending];
      this.pending.clear();
      const roots = batch.filter((root) => !batch.some((other) => other !== root && (other as Node).contains(root as Node)));
      for (const root of roots) this.process(root);
    });
  }

  private process(root: ParentNode): void {
    if (this.settings.uiTranslation) translateTree(root);
    if (!this.settings.titleTranslation) return;
    const targets = findTitleTargets(root, this.window.location.pathname);
    if (!targets.length) return;
    this.titles.getMany(targets.map((target) => target.id)).then(async (records) => {
      const render = (items: typeof targets, titles: Map<number, TitleRecord>) => {
        for (const { id, element } of items) {
          const record = titles.get(id);
          if (record && element.isConnected) applyTitle(element, record, this.settings);
        }
      };
      render(targets, records);
      if (!this.settings.bangumiSearch) return;
      const missing = targets.filter((target) => !records.has(target.id)).map((target) => ({
        id: target.id,
        type: target.type,
        title: target.element.dataset.hanzOriginal ?? target.element.textContent?.trim() ?? "",
      })).filter((target) => target.title);
      if (!missing.length) return;
      const resolved = await this.titles.resolveBangumi(missing);
      render(targets, resolved);
    }).catch(() => undefined);
  }
}
