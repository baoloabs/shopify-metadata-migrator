import { AbstractCache } from "../resource"
import { MetafieldDefinition } from "./index"

class MetafieldDefinitionsCache extends AbstractCache<MetafieldDefinition> {}

export const metafieldDefinitionsCache = new MetafieldDefinitionsCache()
