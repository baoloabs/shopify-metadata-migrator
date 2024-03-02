import { parseGidType } from "@shopify/admin-graphql-api-utilities"
import invariant from "tiny-invariant"
import { Scalars } from "../../generated/graphql"
import { Resources } from "../types"
import { logger } from "../utils/logger"
import { ArticleBuilder } from "./article"
import { BlogBuilder } from "./blog"
import { CollectionBuilder } from "./collection"
import { CompanyBuilder } from "./company"
import { CustomerBuilder } from "./customer"
import { GenericFileBuilder } from "./generic-file"
import { LocationBuilder } from "./location"
import { MarketBuilder } from "./market"
import { MediaImageBuilder } from "./media-image"
import { MetaobjectDefinitionBuilder } from "./metaobject-definitions"
import { MetaobjectBuilder } from "./metaobjects"
import { OrderBuilder } from "./order"
import { PageBuilder } from "./page"
import { ProductBuilder } from "./product"
import { ProductVariantsBuilder } from "./product-variant"
import { VideoBuilder } from "./video"

export const validGidTypes = [
	"Article",
	"Blog",
	"Collection",
	"Company",
	"Customer",
	"GenericFile",
	"Location",
	"Market",
	"MediaImage",
	"Metaobject",
	"MetaobjectDefinition",
	"Page",
	"OnlineStorePage",
	"Order",
	"Product",
	"ProductVariant",
	"Video",
] as const

export async function resourceFactory(sourceId: Scalars["ID"]["output"], identifier?: string): Promise<Resources> {
	const ResourceBuilder = getResourceBuilderClass(sourceId)

	const resourceBuilder = new ResourceBuilder({ sourceId, identifier })

	return resourceBuilder.build()
}

function getResourceBuilderClass(id: Scalars["ID"]["output"]) {
	switch (parseGidType(id)) {
		case "Article":
			return ArticleBuilder
		case "Blog":
			return BlogBuilder
		case "Collection":
			return CollectionBuilder
		case "Company":
			return CompanyBuilder
		case "Customer":
			return CustomerBuilder
		case "GenericFile":
			return GenericFileBuilder
		case "Location":
			return LocationBuilder
		case "Market":
			return MarketBuilder
		case "MediaImage":
			return MediaImageBuilder
		case "Metaobject":
			return MetaobjectBuilder
		case "MetaobjectDefinition":
			return MetaobjectDefinitionBuilder
		case "Page":
		case "OnlineStorePage":
			return PageBuilder
		case "Order":
			return OrderBuilder
		case "Product":
			return ProductBuilder
		case "ProductVariant":
			return ProductVariantsBuilder
		case "Video":
			return VideoBuilder
		default:
			throw new Error(`Cannot find resource class for id ${id}`)
	}
}

export async function getReferenceValue(sourceValue: string) {
	if (!sourceValue.includes("gid://shopify")) {
		return sourceValue
	}

	const isAJSONValue = sourceValue.startsWith("{") || sourceValue.startsWith("[{")

	if (isAJSONValue) {
		const gids = sourceValue.match(/gid:\/\/shopify\/([a-zA-Z]+)\/(\d+)/g) || []
		const validGids = gids.filter(gid => validGidTypes.some(type => gid.includes(`/${type}/`)))
		const newValues = await Promise.all(
			validGids.map(async gid => {
				const resource = await resourceFactory(gid)
				if (typeof resource === "undefined") {
					throw new Error(
						`Cannot create metaobject definition validation on target store because it can't find the resource ${gid} on the target store`,
					)
				}
				return resource.targetId
			}),
		)

		return validGids.reduce((acc, value, index) => {
			const newValue = newValues[index]
			invariant(newValue != null, `Can't find value for ${value}`)

			return acc.replace(value, newValue)
		}, sourceValue)
	}

	const parsedValue = sourceValue.startsWith("[") ? JSON.parse(sourceValue) : sourceValue

	if (Array.isArray(parsedValue)) {
		const newValues = await Promise.all(
			parsedValue.map(async value => {
				const resource = await resourceFactory(value)
				if (typeof resource === "undefined") {
					throw new Error(
						`Cannot create metaobject definition validation on target store because it can't find the resource ${value} on the target store`,
					)
				}
				return resource.targetId
			}),
		)

		return JSON.stringify(newValues)
	}

	const resource = await resourceFactory(parsedValue)

	if (typeof resource === "undefined") {
		throw new Error(`Cannot get value for ${parsedValue} because it can't find the resource`)
	}

	return resource.targetId
}
