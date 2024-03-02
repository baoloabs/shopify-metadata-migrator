import { AbstractCache } from "../resource"
import { Blog } from "./index"

export class BlogsCache extends AbstractCache<Blog> {}

export const blogsCache = new BlogsCache()
