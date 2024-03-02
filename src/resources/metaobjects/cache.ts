import { AbstractCache } from "../resource"
import { Metaobject } from "./index"

class MetaobjectCache extends AbstractCache<Metaobject> {}

export const metaobjectsCache = new MetaobjectCache()
