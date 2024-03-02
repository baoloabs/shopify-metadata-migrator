import { AbstractCache } from "../resource"
import { Video } from "./index"

class VideosCache extends AbstractCache<Video> {}

export const videosCache = new VideosCache()
