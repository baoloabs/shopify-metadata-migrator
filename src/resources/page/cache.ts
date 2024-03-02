import { AbstractCache } from "../resource"
import { Page } from "./index"

export class PagesCache extends AbstractCache<Page> {}

export const pagesCache = new PagesCache()
