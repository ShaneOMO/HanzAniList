import { browser } from "wxt/browser";
import { isGetTitlesRequest, type GetTitlesResponse } from "./title-protocol";
import type { TitleRepository } from "./title-repository";

export function registerTitleService(repository: TitleRepository): void {
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isGetTitlesRequest(message)) return undefined;
    return repository.getMany(message.ids).then((titles): GetTitlesResponse => ({
      titles: Object.fromEntries([...titles].map(([id, record]) => [id, record])),
    }));
  });
}
