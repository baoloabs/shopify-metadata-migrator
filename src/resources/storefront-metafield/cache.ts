import { AbstractCache } from "../resource"
import { StorefrontMetafield } from "./index"

class StorefrontCache extends AbstractCache<StorefrontMetafield> {}

export const storefrontMetafieldsCache = new StorefrontCache()
