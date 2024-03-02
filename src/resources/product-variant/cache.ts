import { AbstractCache } from "../resource"
import { ProductVariant } from "./index"

export class ProductsVariantsCache extends AbstractCache<ProductVariant> {}

export const productsVariantsCache = new ProductsVariantsCache()
