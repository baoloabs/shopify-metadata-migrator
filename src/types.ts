import { MetafieldDefinitionsQuery, MetaobjectDefinitionsQuery, MetaobjectsQuery, Node } from "../../generated/graphql"
import { Article } from "./resources/article"
import { Blog } from "./resources/blog"
import { Collection } from "./resources/collection"
import { Company } from "./resources/company"
import { Customer } from "./resources/customer"
import { GenericFile } from "./resources/generic-file"
import { Location } from "./resources/location"
import { Market } from "./resources/market"
import { MediaImage } from "./resources/media-image"
import { MetaobjectDefinition } from "./resources/metaobject-definitions"
import { Metaobject } from "./resources/metaobjects"
import { Order } from "./resources/order"
import { Page } from "./resources/page"
import { Product } from "./resources/product"
import { ProductVariant } from "./resources/product-variant"
import { Video } from "./resources/video"

export type MetafieldDefinitions = MetafieldDefinitionsQuery["metafieldDefinitions"]["edges"][number]["node"][]
export type MetaobjectDefinitions = MetaobjectDefinitionsQuery["metaobjectDefinitions"]["edges"][number]["node"][]
export type Metaobjects = MetaobjectsQuery["metaobjects"]["edges"][number]["node"][]
export type Resources =
	| Article
	| Blog
	| Collection
	| Company
	| Customer
	| GenericFile
	| Location
	| Market
	| Metaobject
	| MetaobjectDefinition
	| MediaImage
	| Order
	| Page
	| Product
	| ProductVariant
	| Video

export type ResourceName = {
	single: string
	plural: string
}

export type WithParentId<T> = T & {
	__parentId: string
}

export type BulkOperationQueryLine = Node & {
	__parentId?: string
}

export type BulkImportResultLine<T extends BulkOperationQueryLine> = {
	data: T
	__lineNumber: number
}

export type PossibleBaseLines<T extends Node> =
	| BulkOperationQueryLine
	| BulkImportResultLine<T>
	| { __parentId: string }

export type BaseBulkMigratorOptions = {
	forceFresh: boolean
}
export const baseBulkMigratorOptions: BaseBulkMigratorOptions = {
	forceFresh: true,
}
