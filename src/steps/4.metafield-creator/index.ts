import invariant from "tiny-invariant"
import {
	AdminMetafieldDefinitionReferencesDocument,
	AdminMetafieldDefinitionReferencesQuery,
	MetafieldDefinitionsDocument,
	MetafieldOwnerType,
} from "../../../generated/graphql"
import {
	StorefrontMetafieldFragmentFragment,
	StorefrontMetafieldReferencesArticlesDocument,
	StorefrontMetafieldReferencesArticlesQuery,
	StorefrontMetafieldReferencesBlogsDocument,
	StorefrontMetafieldReferencesBlogsQuery,
	StorefrontMetafieldReferencesPagesDocument,
	StorefrontMetafieldReferencesPagesQuery,
} from "../../../generated/graphql-storefront"
import { makeRequest } from "../../graphql"
import { AdminMetafieldBuilder, AdminMetafieldIdentifierBuilder } from "../../resources/admin-metafield"
import { StorefrontMetafieldBuilder, StorefrontMetafieldIdentifierBuilder } from "../../resources/storefront-metafield"
import { MetafieldDefinitions } from "../../types"
import { logger } from "../../utils/logger"

// These exist within `adminMetafieldDefinitionReferencesQuery` as they appear within the "owner" field in a metafields connection. For some reason some are missing though.
const metafieldOwnerTypesWeCanDoAutomagically = [
	// MetafieldOwnerType.Collection,
	MetafieldOwnerType.Product,
	MetafieldOwnerType.Productvariant,

	// We don't currently transfer these resources so need to leave them out of this

	// MetafieldOwnerType.Company,
	// MetafieldOwnerType.CompanyLocation,
	// MetafieldOwnerType.Customer,
	// MetafieldOwnerType.Location,
	// MetafieldOwnerType.Market,
	// MetafieldOwnerType.Order,
]

/*
  We might not actually be able to migrate these as you can't get them via GQL. They are only implemented in the GraphQL admin API as references

  Maybe we can use the storefront API to get them?
 */
const metafieldOwnerTypesWeCantDoAutomagically = [
	MetafieldOwnerType.Article,
	MetafieldOwnerType.Blog,
	MetafieldOwnerType.Page,
]

type StorefrontOwnerTypes = MetafieldOwnerType.Article | MetafieldOwnerType.Blog | MetafieldOwnerType.Page

type StorefrontMetafieldReferencesQuery = {
	[MetafieldOwnerType.Article]: NonNullable<StorefrontMetafieldReferencesArticlesQuery["records"]>["nodes"]
	[MetafieldOwnerType.Blog]: NonNullable<StorefrontMetafieldReferencesBlogsQuery["records"]>["nodes"]
	[MetafieldOwnerType.Page]: NonNullable<StorefrontMetafieldReferencesPagesQuery["records"]>["nodes"]
}

export async function migrateMetafields() {
	await MetafieldMigrator.run()
}

class MetafieldMigrator {
	static async run() {
		const creator = new MetafieldMigrator()

		return creator.run()
	}

	async run() {
		await this.handleAutomagicalDefinitions()
		await this.handleSimpleDefinitions()
	}

	private async handleAutomagicalDefinitions() {
		const automagicalDefinitions = await this.getAllAutomagicalSourceMetafieldDefinitions()

		for (const automagicalDefinition of automagicalDefinitions) {
			const metafieldsRelatedToDefinition = await this.getAllSourceMetafieldDefinitionReferencesByMagicalDefinition(
				automagicalDefinition.id,
			)

			for (const metafield of metafieldsRelatedToDefinition) {
				if (metafield.owner.__typename === "Product" && metafield.owner.isGiftCard) continue

				try {
					const builder = new AdminMetafieldBuilder({
						source: metafield,
						identifier: new AdminMetafieldIdentifierBuilder().buildIdentifierFromParts(metafield),
						sourceId: metafield.id,
						ownerType: metafield.ownerType,
					})

					await builder.build()
				} catch (e: any) {
					logger.error({ error: e })
				}
			}
		}
	}

	private async handleSimpleDefinitions() {
		const simpleDefinitions = await this.getAllSimpleSourceMetafieldDefinitions()

		const articleSimpleDefinitions = simpleDefinitions.filter(
			({ ownerType }) => ownerType === MetafieldOwnerType.Article,
		)
		const blogSimpleDefinitions = simpleDefinitions.filter(({ ownerType }) => ownerType === MetafieldOwnerType.Blog)
		const pageSimpleDefinitions = simpleDefinitions.filter(({ ownerType }) => ownerType === MetafieldOwnerType.Page)

		for (const articleSimpleDefinition of articleSimpleDefinitions) {
			const referencesRelatedToMetafield = await this.getAllSourceMetafieldDefinitionReferencesBySimpleDefinition(
				MetafieldOwnerType.Article,
				articleSimpleDefinition.namespace,
				articleSimpleDefinition.key,
			)

			for (const reference of referencesRelatedToMetafield) {
				const builder = new StorefrontMetafieldBuilder({
					identifier: new StorefrontMetafieldIdentifierBuilder().buildIdentifierFromParts(
						reference.metafield as unknown as StorefrontMetafieldFragmentFragment,
					),
					sourceId: reference?.metafield?.id,
					ownerType: MetafieldOwnerType.Article,
				})

				await builder.build()
			}
		}

		for (const blogSimpleDefinition of blogSimpleDefinitions) {
			const referencesRelatedToMetafield = await this.getAllSourceMetafieldDefinitionReferencesBySimpleDefinition(
				MetafieldOwnerType.Blog,
				blogSimpleDefinition.namespace,
				blogSimpleDefinition.key,
			)

			for (const reference of referencesRelatedToMetafield) {
				const builder = new StorefrontMetafieldBuilder({
					identifier: new StorefrontMetafieldIdentifierBuilder().buildIdentifierFromParts(
						reference.metafield as unknown as StorefrontMetafieldFragmentFragment,
					),
					sourceId: reference?.metafield?.id,
					ownerType: MetafieldOwnerType.Blog,
				})

				await builder.build()
			}
		}

		for (const pageSimpleDefinition of pageSimpleDefinitions) {
			const referencesRelatedToMetafield = await this.getAllSourceMetafieldDefinitionReferencesBySimpleDefinition(
				MetafieldOwnerType.Page,
				pageSimpleDefinition.namespace,
				pageSimpleDefinition.key,
			)

			for (const reference of referencesRelatedToMetafield) {
				const builder = new StorefrontMetafieldBuilder({
					identifier: new StorefrontMetafieldIdentifierBuilder().buildIdentifierFromParts(
						reference.metafield as unknown as StorefrontMetafieldFragmentFragment,
					),
					sourceId: reference?.metafield?.id,
					ownerType: MetafieldOwnerType.Page,
				})

				await builder.build()
			}
		}
	}

	private async getAllSourceMetafieldDefinitions() {
		const types = Object.values(MetafieldOwnerType)

		return types.reduce(
			async (definitions, type) => {
				const metafieldsByType = await this.getAllSourceMetafieldDefinitionsByType(type)

				return [...(await definitions), ...metafieldsByType]
			},
			Promise.resolve([] as MetafieldDefinitions),
		)
	}

	private async getAllAutomagicalSourceMetafieldDefinitions() {
		return (await this.getAllSourceMetafieldDefinitions()).filter(definition =>
			metafieldOwnerTypesWeCanDoAutomagically.includes(definition.ownerType),
		)
	}

	private async getAllSimpleSourceMetafieldDefinitions() {
		return (await this.getAllSourceMetafieldDefinitions()).filter(definition =>
			metafieldOwnerTypesWeCantDoAutomagically.includes(definition.ownerType),
		)
	}

	private async getAllSourceMetafieldDefinitionsByType(type: MetafieldOwnerType) {
		const getMetafieldDefinitions = async (definitions: MetafieldDefinitions = [], after?: string) => {
			const { metafieldDefinitions } = await makeRequest(global.sourceClient, {
				document: MetafieldDefinitionsDocument,
				variables: { first: 10, after, ownerType: type },
			})

			definitions.push(...metafieldDefinitions.edges.map(({ node }) => node))

			if (metafieldDefinitions.pageInfo.hasNextPage && metafieldDefinitions.pageInfo.endCursor != null) {
				await getMetafieldDefinitions(definitions, metafieldDefinitions.pageInfo.endCursor)
			}

			return this.filterOutStandardDefinitions(definitions)
		}

		return getMetafieldDefinitions()
	}

	private async getAllSourceMetafieldDefinitionReferencesByMagicalDefinition(id: string) {
		const getMetafields = async (
			metafields: NonNullable<
				AdminMetafieldDefinitionReferencesQuery["metafieldDefinition"]
			>["metafields"]["nodes"] = [],
			after?: string,
		) => {
			const { metafieldDefinition } = await makeRequest(global.sourceClient, {
				document: AdminMetafieldDefinitionReferencesDocument,
				variables: {
					first: 250,
					id: id,
					after,
				},
			})

			invariant(metafieldDefinition, `Could not find a metafield definition with the ID "${id}"`)

			metafields.push(...metafieldDefinition.metafields.nodes)

			if (
				metafieldDefinition.metafields.pageInfo.hasNextPage &&
				metafieldDefinition.metafields.pageInfo.endCursor != null
			) {
				await getMetafields(metafields, metafieldDefinition.metafields.pageInfo.endCursor)
			}

			return metafields
		}

		return getMetafields()
	}

	private async getAllSourceMetafieldDefinitionReferencesBySimpleDefinition<OwnerType extends StorefrontOwnerTypes>(
		ownerType: OwnerType,
		namespace: string,
		key: string,
	) {
		type Metafields = StorefrontMetafieldReferencesQuery[OwnerType]

		const document = this.getStorefrontDefinitionReferencesDocument(ownerType)

		const getMetafields = async (metafields: Metafields = [], after?: string) => {
			const { records } = await makeRequest(global.sourceStorefrontClient, {
				document,
				variables: {
					namespace,
					key,
					after,
					first: 250,
				},
			})

			invariant(
				records,
				`Could not find any records for the metafield definition with the namespace "${namespace}" and key "${key}"`,
			)

			// @ts-ignore
			metafields.push(...(records.nodes as Metafields))

			if (records.pageInfo.hasNextPage && records.pageInfo.endCursor != null) {
				await getMetafields(metafields, records.pageInfo.endCursor)
			}

			// @ts-ignore
			return metafields.filter(metafield => metafield.metafield != null) as Metafields
		}

		return getMetafields()
	}

	private filterOutStandardDefinitions(definitions: MetafieldDefinitions) {
		return definitions.filter(({ standardTemplate }) => standardTemplate == null)
	}

	private getStorefrontDefinitionReferencesDocument(ownerType: StorefrontOwnerTypes) {
		switch (ownerType) {
			case MetafieldOwnerType.Article:
				return StorefrontMetafieldReferencesArticlesDocument
			case MetafieldOwnerType.Blog:
				return StorefrontMetafieldReferencesBlogsDocument
			case MetafieldOwnerType.Page:
				return StorefrontMetafieldReferencesPagesDocument
		}
	}
}
