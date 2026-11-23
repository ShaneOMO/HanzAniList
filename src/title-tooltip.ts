import { tooltipAttribute } from "./title-renderer";

export class TitleTooltip {
  private readonly element: HTMLDivElement;

  constructor(private readonly document: Document) {
    this.element = document.createElement("div");
    this.element.className = "hanz-tooltip";
    this.element.hidden = true;
    this.element.setAttribute("role", "tooltip");
    document.body.append(this.element);
    document.addEventListener("pointerover", this.show);
    document.addEventListener("focusin", this.show);
    document.addEventListener("pointerout", this.hide);
    document.addEventListener("keydown", this.hide);
    document.addEventListener("scroll", this.hide, true);
  }

  private readonly show = (event: Event): void => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(`[${tooltipAttribute}]`) : null;
    if (!target) return;
    this.element.replaceChildren();
    const title = this.document.createElement("strong");
    title.textContent = target.getAttribute(tooltipAttribute);
    const original = this.document.createElement("span");
    original.textContent = target.dataset.hanzOriginal ?? "";
    const source = this.document.createElement("a");
    source.textContent = target.dataset.hanzSource ?? "";
    source.href = target.dataset.hanzSourceUrl ?? "https://github.com/soruly/anilist-chinese";
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    this.element.append(title, original, source);
    const aliases = target.dataset.hanzAliases;
    if (aliases) {
      const other = this.document.createElement("small");
      other.textContent = `其他译名：${aliases}`;
      this.element.append(other);
    }
    this.element.hidden = false;
    const rect = target.getBoundingClientRect();
    const width = Math.min(360, this.document.defaultView!.innerWidth - 24);
    this.element.style.width = `${width}px`;
    this.element.style.left = `${Math.max(12, Math.min(rect.left, this.document.defaultView!.innerWidth - width - 12))}px`;
    const top = rect.bottom + 8 + this.element.offsetHeight > this.document.defaultView!.innerHeight
      ? rect.top - this.element.offsetHeight - 8
      : rect.bottom + 8;
    this.element.style.top = `${Math.max(8, top)}px`;
  };

  private readonly hide = (event: Event): void => {
    if (event.type === "pointerout" && event instanceof PointerEvent && event.relatedTarget === this.element) return;
    this.element.hidden = true;
  };
}
