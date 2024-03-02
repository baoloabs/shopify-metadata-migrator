import { AbstractCache } from "../resource"
import { Market } from "./index"

export class MarketsCache extends AbstractCache<Market> {}

export const marketsCache = new MarketsCache()
