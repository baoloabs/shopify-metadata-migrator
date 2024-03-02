import { AbstractCache } from "../resource"
import { GenericFile } from "./index"

class GenericFilesCache extends AbstractCache<GenericFile> {}

export const genericFilesCache = new GenericFilesCache()
