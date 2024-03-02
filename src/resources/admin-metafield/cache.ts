import { AbstractCache } from "../resource"
import { AdminMetafield } from "./index"

class AdminMetafieldCache extends AbstractCache<AdminMetafield> {}

export const adminMetafieldsCache = new AdminMetafieldCache()
