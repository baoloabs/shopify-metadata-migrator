import { AbstractCache } from "../resource"
import { Collection } from "./index"

class CollectionsCache extends AbstractCache<Collection> {}

export const collectionsCache = new CollectionsCache()
