import { AbstractCache } from "../resource"
import { MediaImage } from "./index"

class MediaImagesCache extends AbstractCache<MediaImage> {}

export const mediaImagesCache = new MediaImagesCache()
