import { ProductDeleteAsyncDocument } from "../../../generated/graphql"
import { makeRequest } from "../../graphql"
import { PRODUCT_TYPES_TO_IGNORE } from "../../resources/product/constants"
import { getContext } from "../../utils/context"
import { logger } from "../../utils/logger"
import { bulkQueryProduct } from "../7.bulk-product-migrator/bulk-product-migrator"

export async function removeUnwantedProducts() {
	const context = getContext()
	const targetProducts = await bulkQueryProduct(context.targetClient, true)

	for (const targetProduct of targetProducts.values()) {
		if (PRODUCT_TYPES_TO_IGNORE.includes(targetProduct.productType)) {
			const target = await makeRequest(context.targetClient, {
				document: ProductDeleteAsyncDocument,
				variables: {
					productId: targetProduct.id,
				},
			})

			logger.info({ targetProduct, target }, `Deleted product ${targetProduct.id}`)

			continue
		}

		// Ignore bundle-based products
		if (targetProduct.hasVariantsThatRequiresComponents) {
			const target = await makeRequest(context.targetClient, {
				document: ProductDeleteAsyncDocument,
				variables: {
					productId: targetProduct.id,
				},
			})

			logger.info({ targetProduct, target }, `Deleted product ${targetProduct.id}`)
		}
	}
}
