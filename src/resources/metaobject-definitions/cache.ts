import { AbstractCache } from "../resource"
import { MetaobjectDefinition } from "./index"

class MetaobjectDefinitionsCache extends AbstractCache<MetaobjectDefinition> {}

export const metaobjectDefinitionsCache = new MetaobjectDefinitionsCache()
