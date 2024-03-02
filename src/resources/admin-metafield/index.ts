import invariant from "tiny-invariant"
import {
	AdminMetafieldByIdDocument,
	AdminMetafieldByIdentifierCollectionDocument,
	AdminMetafieldByIdentifierCompanyDocument,
	AdminMetafieldByIdentifierCompanyLocationDocument,
	AdminMetafieldByIdentifierCustomerDocument,
	AdminMetafieldByIdentifierLocationDocument,
	AdminMetafieldByIdentifierMarketDocument,
	AdminMetafieldByIdentifierOrderDocument,
	AdminMetafieldByIdentifierProductDocument,
	AdminMetafieldByIdentifierProductVariantDocument,
	AdminMetafieldCreateDocument,
	AdminMetafieldFragmentFragment,
	MetafieldOwnerType,
} from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { logger } from "../../utils/logger"
import { getReferenceValue, resourceFactory } from "../factory"
import { Product } from "../product"
import { PRODUCT_TYPES_TO_IGNORE } from "../product/constants"
import { AbstractBuilder, AbstractIdentifierBuilder, AbstractResource } from "../resource"
import { adminMetafieldsCache } from "./cache"

export class AdminMetafield extends AbstractResource<AdminMetafieldFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class AdminMetafieldBuilder extends AbstractBuilder<AdminMetafieldFragmentFragment, AdminMetafield> {
	async _createOnTargetStore(source: AdminMetafieldFragmentFragment) {
		if (notEmpty(this.target)) return this.target

		// @ts-ignore
		const ownerTarget = await resourceFactory(source.owner.id)

		const value = await getReferenceValue(source.value)

		const target = await makeRequest(global.targetClient, {
			document: this.documents.create,
			variables: {
				metafields: [
					{
						ownerId: ownerTarget.targetId,
						key: source.key,
						namespace: source.namespace,
						type: source.type,
						value,
					},
				],
			},
		})

		if ((target?.metafieldsSet?.userErrors?.length || 0) > 0) {
			logger.error(
				{
					errors: target?.metafieldsSet?.userErrors,
					source,
					target,
				},
				"AdminMetafieldBuilder._createOnTargetStore",
			)
		}

		invariant(target?.metafieldsSet?.metafields?.[0])

		this.target = target.metafieldsSet.metafields[0]

		return this.target
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const identifierBuilder = new AdminMetafieldIdentifierBuilder()
		const { namespace, key, ownerId, ownerType } = identifierBuilder.extractPartsFromIdentifier(identifier)

		const source = await makeRequest(client, {
			document: this.getByIdentifierDocumentByOwnerType(ownerType),
			variables: {
				ownerId: client === this.targetClient ? (await resourceFactory(ownerId)).target.id : ownerId,
				namespace,
				key,
			},
		})

		return source?.record?.metafield
	}

	getIdentifierFromSource(source: AdminMetafieldFragmentFragment) {
		const identifierBuilder = new AdminMetafieldIdentifierBuilder()

		return identifierBuilder.buildIdentifierFromParts(source)
	}

	private getByIdentifierDocumentByOwnerType(ownerType: MetafieldOwnerType) {
		switch (ownerType) {
			case MetafieldOwnerType.Collection:
				return AdminMetafieldByIdentifierCollectionDocument
			case MetafieldOwnerType.Company:
				return AdminMetafieldByIdentifierCompanyDocument
			case MetafieldOwnerType.CompanyLocation:
				return AdminMetafieldByIdentifierCompanyLocationDocument
			case MetafieldOwnerType.Customer:
				return AdminMetafieldByIdentifierCustomerDocument
			case MetafieldOwnerType.Location:
				return AdminMetafieldByIdentifierLocationDocument
			case MetafieldOwnerType.Market:
				return AdminMetafieldByIdentifierMarketDocument
			case MetafieldOwnerType.Order:
				return AdminMetafieldByIdentifierOrderDocument
			case MetafieldOwnerType.Product:
				return AdminMetafieldByIdentifierProductDocument
			case MetafieldOwnerType.Productvariant:
				return AdminMetafieldByIdentifierProductVariantDocument

			case MetafieldOwnerType.Article:
			case MetafieldOwnerType.Blog:
			case MetafieldOwnerType.Page:
				throw new Error(`Cannot get metafield by identifier for ownerType "${ownerType}"`)
			default:
				throw new Error(`Unknown ownerType "${ownerType}"`)
		}
	}

	get Resource() {
		return AdminMetafield
	}

	get cache() {
		return adminMetafieldsCache
	}

	get documents() {
		return {
			getByIdentifier: AdminMetafieldByIdentifierCollectionDocument,
			getById: AdminMetafieldByIdDocument,
			create: AdminMetafieldCreateDocument,
		}
	}
}

export class AdminMetafieldIdentifierBuilder extends AbstractIdentifierBuilder<AdminMetafieldFragmentFragment> {
	extractIdentifierFromSource(source: AdminMetafieldFragmentFragment) {
		const allowedOwnerTypes = [
			"Collection",
			"Company",
			"CompanyLocation",
			"Customer",
			"Location",
			"Market",
			"Order",
			"Product",
			"ProductVariant",
		]
		invariant(allowedOwnerTypes.includes(source.owner.__typename), `Unknown ownerType "${source.owner.__typename}"`)

		return {
			key: source.key,
			namespace: source.namespace,
			ownerType: source.ownerType,
			// @ts-ignore
			ownerId: source.owner.id,
		}
	}

	extractPartsFromIdentifier(identifier: string) {
		const searchParams = new URLSearchParams(identifier)

		const [key, namespace, ownerId, ownerType] = [
			searchParams.get("key"),
			searchParams.get("namespace"),
			searchParams.get("ownerId"),
			searchParams.get("ownerType"),
		]

		invariant(key, "key must be present in identifier")
		invariant(namespace, "namespace must be present in identifier")
		invariant(ownerId, "ownerId must be present in identifier")
		invariant(ownerType, "ownerType must be present in identifier")

		return {
			key,
			namespace,
			ownerId,
			ownerType: ownerType as MetafieldOwnerType,
		}
	}
}
