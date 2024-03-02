import { AbstractCache } from "../resource"
import { Product } from "./index"

export class ProductsCache extends AbstractCache<Product> {}

export const productsCache = new ProductsCache()
