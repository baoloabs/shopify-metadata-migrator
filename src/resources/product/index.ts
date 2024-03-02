import { ProductByIdDocument, ProductByIdentifierDocument, ProductFragmentFragment } from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { logger } from "../../utils/logger"
import { AbstractBuilder, AbstractResource } from "../resource"
import { productsCache } from "./cache"

export class Product extends AbstractResource<ProductFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class ProductBuilder extends AbstractBuilder<ProductFragmentFragment, Product> {
	async _createOnTargetStore(source: ProductFragmentFragment) {
		if (notEmpty(this.target)) return this.target

		logger.info({ source })

		throw new Error(`Cannot create ${this.resourceName} on target store`)
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const source = await makeRequest(client, {
			document: this.documents.getByIdentifier,
			variables: {
				handle: identifier,
			},
		})

		return source.record
	}

	getIdentifierFromSource(source: ProductFragmentFragment): string {
		return source.handle
	}

	get Resource() {
		return Product
	}

	get cache() {
		return productsCache
	}

	get documents() {
		return {
			getByIdentifier: ProductByIdentifierDocument,
			getById: ProductByIdDocument,
		}
	}
}
export { productResource } from "./utils"
