import type { Settings } from "./types";
import type { TitleRepository } from "./title-repository";
import { applyTitle, findTitleTargets } from "./title-renderer";
import { translateTree } from "./ui-translator";

export class ContentController {
  private readonly pending = new Set<ParentNode>();
  private frame?: number;

  constructor(
    private readonly settings: Settings,
    private readonly repository: TitleRepository,
    private readonly window: Window,
  ) {}

  start(): void {
    this.process(this.window.document);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element || node instanceof DocumentFragment) this.schedule(node);
        }
      }
    });
    observer.observe(this.window.document.body, { childList: true, subtree: true });
  }

  schedule(root: ParentNode): void {
    this.pending.add(root);
    if (this.frame !== undefined) return;
    this.frame = this.window.requestAnimationFrame(() => {
      this.frame = undefined;
      const batch = [...this.pending];
      this.pending.clear();
      for (const root of batch) this.process(root);
    });
  }

  private process(root: ParentNode): void {
    if (this.settings.uiTranslation) translateTree(root);
    if (!this.settings.titleTranslation) return;
    const targets = findTitleTargets(root, this.window.location.pathname);
    this.runLimited(targets, 6, async ({ id, element }) => {
      const record = await this.repository.get(id);
      if (record && element.isConnected) applyTitle(element, record, this.settings);
    }).catch(() => undefined);
  }

  private async runLimited<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
    let index = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (index < items.length) {
        const item = items[index++]!;
        await task(item);
      }
    });
    await Promise.all(workers);
  }
}
