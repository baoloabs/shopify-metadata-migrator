import { AbstractCache } from "../resource"
import { Article } from "./index"

export class ArticlesCache extends AbstractCache<Article> {}

export const articlesCache = new ArticlesCache()
