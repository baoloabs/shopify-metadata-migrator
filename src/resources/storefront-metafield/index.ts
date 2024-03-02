import { parseGid } from "@shopify/admin-graphql-api-utilities"
import invariant from "tiny-invariant"
import {
	StorefrontMetafieldByIdentifierArticleDocument,
	StorefrontMetafieldByIdentifierBlogDocument,
	StorefrontMetafieldByIdentifierPageDocument,
	StorefrontMetafieldFragmentFragment,
} from "../../../generated/graphql-storefront"
import { ENV } from "../../env"
import { StorefrontMetafieldByIdDocument, StorefrontMetafieldCreateDocument } from "../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { logger } from "../../utils/logger"
import { getReferenceValue, resourceFactory } from "../factory"
import { AbstractBuilder, AbstractIdentifierBuilder, AbstractResource } from "../resource"
import { storefrontMetafieldsCache } from "./cache"

export class StorefrontMetafield extends AbstractResource<StorefrontMetafieldFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class StorefrontMetafieldBuilder extends AbstractBuilder<
	StorefrontMetafieldFragmentFragment,
	StorefrontMetafield
> {
	storefront = true

	async _createOnTargetStore(source: StorefrontMetafieldFragmentFragment) {
		if (notEmpty(this.target)) return this.target

		// @ts-ignore
		const ownerTarget = await resourceFactory(source.parentResource.id)

		const value = await getReferenceValue(source.value)

		const url = this.getRestApiUrlByParentType(
			source.parentResource.__typename as "Article" | "Blog" | "Page",
			parseGid(ownerTarget.targetId),
		)
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Shopify-Access-Token": ENV.TARGET_API_ACCESS_TOKEN,
			},
			body: JSON.stringify({
				metafield: {
					key: source.key,
					namespace: source.namespace,
					type: source.type,
					value,
				},
			}),
		})
		const json = await response.json()

		const identifier = this.getIdentifierFromSource(source)
		const urlParams = new URLSearchParams(identifier)
		urlParams.set("parentId", ownerTarget.targetId.replace("OnlineStore", ""))

		const target = await this._makeByIdentifierRequest(this.targetClient, urlParams.toString())

		logger.info({
			client: this.targetClient,
			source,
			target,
			identifier,
			urlParams: urlParams.toString(),
			ownerTarget,
			value,
		})

		invariant(target, `Could not create ${this.resourceName} on target store`)

		this.target = target

		return this.target
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const identifierBuilder = new StorefrontMetafieldIdentifierBuilder()
		const { namespace, key, parentId, parentType } = identifierBuilder.extractPartsFromIdentifier(identifier)

		const source = await makeRequest(client, {
			document: this.getByIdentifierDocumentByParentType(parentType),
			variables: {
				parentId: parentId.replace("OnlineStore", ""),
				namespace,
				key,
			},
		})

		logger.info({
			source,
			variables: {
				parentId: parentId.replace("OnlineStore", ""),
				namespace,
				key,
			},
		})

		return source?.record?.metafield
	}

	getIdentifierFromSource(source: StorefrontMetafieldFragmentFragment) {
		const identifierBuilder = new StorefrontMetafieldIdentifierBuilder()

		return identifierBuilder.buildIdentifierFromParts(source)
	}

	private getByIdentifierDocumentByParentType(ownerType: "Article" | "Blog" | "Page") {
		switch (ownerType) {
			case "Article":
				return StorefrontMetafieldByIdentifierArticleDocument
			case "Blog":
				return StorefrontMetafieldByIdentifierBlogDocument
			case "Page":
				return StorefrontMetafieldByIdentifierPageDocument
			default:
				throw new Error(`Unknown ownerType "${ownerType}"`)
		}
	}

	private getRestApiUrlByParentType(ownerType: "Article" | "Blog" | "Page", id: string) {
		switch (ownerType) {
			case "Article":
				return `https://${ENV.TARGET_API_STORE}.myshopify.com/admin/api/${ENV.API_VERSION}/articles/${id}/metafields.json`
			case "Blog":
				return `https://${ENV.TARGET_API_STORE}.myshopify.com/admin/api/${ENV.API_VERSION}/blogs/${id}/metafields.json`
			case "Page":
				return `https://${ENV.TARGET_API_STORE}.myshopify.com/admin/api/${ENV.API_VERSION}/pages/${id}/metafields.json`
		}
	}

	get Resource() {
		return StorefrontMetafield
	}

	get cache() {
		return storefrontMetafieldsCache
	}

	get documents() {
		return {
			getByIdentifier: StorefrontMetafieldByIdentifierArticleDocument,
			getById: StorefrontMetafieldByIdDocument,
			create: StorefrontMetafieldCreateDocument,
		}
	}
}

export class StorefrontMetafieldIdentifierBuilder extends AbstractIdentifierBuilder<StorefrontMetafieldFragmentFragment> {
	extractIdentifierFromSource(source: StorefrontMetafieldFragmentFragment) {
		const allowedOwnerTypes = ["Article", "Blog", "Page"]
		invariant(
			allowedOwnerTypes.includes(source.parentResource.__typename),
			`Unknown ownerType "${source.parentResource.__typename}"`,
		)

		return {
			key: source.key,
			namespace: source.namespace,
			parentType: source.parentResource.__typename,
			// @ts-ignore
			parentId: source.parentResource.id,
		}
	}

	extractPartsFromIdentifier(identifier: string) {
		const searchParams = new URLSearchParams(identifier)

		const [key, namespace, parentId, parentType] = [
			searchParams.get("key"),
			searchParams.get("namespace"),
			searchParams.get("parentId"),
			searchParams.get("parentType"),
		]

		invariant(key, "key must be present in identifier")
		invariant(namespace, "namespace must be present in identifier")
		invariant(parentId, "parentId must be present in identifier")
		invariant(parentType, "parentType must be present in identifier")

		return {
			key,
			namespace,
			parentId,
			parentType: parentType as "Article" | "Blog" | "Page",
		}
	}
}
