import { parseGid } from "@shopify/admin-graphql-api-utilities"
import invariant from "tiny-invariant"
import {
	ProductVariantByIdDocument,
	ProductVariantByIdentifierDocument,
	ProductVariantFragmentFragment,
} from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { resourceFactory } from "../factory"
import { AbstractBuilder, AbstractIdentifierBuilder, AbstractResource } from "../resource"
import { productsVariantsCache } from "./cache"

export class ProductVariant extends AbstractResource<ProductVariantFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class ProductVariantsBuilder extends AbstractBuilder<ProductVariantFragmentFragment, ProductVariant> {
	async _createOnTargetStore() {
		if (notEmpty(this.target)) return this.target

		throw new Error(`Cannot create ${this.resourceName} on target store`)
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const identifierBuilder = new ProductVariantIdentifierBuilder()

		const query = await identifierBuilder.toQuery(identifier)

		const source = await makeRequest(client, {
			document: this.documents.getByIdentifier,
			variables: {
				query,
			},
		})

		return source?.record?.nodes?.[0]
	}

	getIdentifierFromSource(source: ProductVariantFragmentFragment): string {
		const identifierBuilder = new ProductVariantIdentifierBuilder()

		return identifierBuilder.buildIdentifierFromParts(source)
	}

	get Resource() {
		return ProductVariant
	}

	get cache() {
		return productsVariantsCache
	}

	get documents() {
		return {
			getByIdentifier: ProductVariantByIdentifierDocument,
			getById: ProductVariantByIdDocument,
		}
	}
}

export class ProductVariantIdentifierBuilder extends AbstractIdentifierBuilder<ProductVariantFragmentFragment> {
	async toQuery(identifier: string) {
		const parts = this.extractPartsFromIdentifier(identifier)
		const resource = await resourceFactory(parts.productId)

		const baseQuery = `product_id:${parseGid(resource.targetId)}`
		const optionsQuery = [parts.option1, parts.option2, parts.option3]
			.filter(Boolean)
			.map((option, index) => `option${index + 1}:"${option}"`)
			.join(" AND ")

		return `${baseQuery} AND ${optionsQuery}`
	}

	extractIdentifierFromSource(source: ProductVariantFragmentFragment) {
		const [option1, option2, option3] = source.selectedOptions

		return {
			productId: source.product.id,
			variantId: source.id,
			option1: option1?.value,
			option2: option2?.value ?? undefined,
			option3: option3?.value ?? undefined,
		}
	}

	extractPartsFromIdentifier(
		identifier: string,
	): ReturnType<ProductVariantIdentifierBuilder["extractIdentifierFromSource"]> {
		const searchParams = new URLSearchParams(identifier)
		const [productId, variantId, option1, option2, option3] = [
			searchParams.get("productId"),
			searchParams.get("variantId"),
			searchParams.get("option1"),
			searchParams.get("option2"),
			searchParams.get("option3"),
		]

		invariant(productId != null, `Unable to extract productId from identifier ${identifier}`)
		invariant(variantId != null, `Unable to extract variantId from identifier ${identifier}`)
		invariant(option1 != null, `Unable to extract option1 from identifier ${identifier}`)
		invariant(option2 != null, `Unable to extract option2 from identifier ${identifier}`)
		invariant(option3 != null, `Unable to extract option3 from identifier ${identifier}`)

		return {
			productId,
			variantId,
			option1,
			option2: option2 === "undefined" ? "" : option2,
			option3: option3 === "undefined" ? "" : option2,
		}
	}
}
