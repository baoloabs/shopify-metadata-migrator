import { MetaobjectTypesDocument, MetaobjectTypesQuery, MetaobjectsDocument } from "../../../generated/graphql"
import { makeRequest } from "../../graphql"
import { MetaobjectBuilder, getMetaobjectIdentifier } from "../../resources/metaobjects"
import { Metaobjects } from "../../types"
import { logger } from "../../utils/logger"

export async function migrateMetaobjects() {
	await MetaobjectMigrator.run()
}

class MetaobjectMigrator {
	static async run() {
		const creator = new MetaobjectMigrator()

		return creator.run()
	}

	async run() {
		const metaobjects = await this.getAllMetaobjects()

		for (const rawMetaobject of metaobjects) {
			const builder = new MetaobjectBuilder({
				source: rawMetaobject,
				identifier: getMetaobjectIdentifier(rawMetaobject),
				sourceId: rawMetaobject.id,
				ownerType: rawMetaobject.type,
			})

			try {
				await builder.build()
			} catch (error) {
				logger.error({ error, rawMetaobject })
			}
		}
	}

	private async getAllMetaobjects() {
		const types = await this.getAllMetaobjectTypes()

		return types.reduce(
			async (metaobjects, type) => {
				const metaobjectsByType = await this.getAllSourceMetaobjectsByType(type)

				return [...(await metaobjects), ...metaobjectsByType]
			},
			Promise.resolve([] as Metaobjects),
		)
	}

	private async getAllMetaobjectTypes() {
		const getMetaobjects = async (
			items: MetaobjectTypesQuery["metaobjectDefinitions"]["edges"][number]["node"][] = [],
			after?: string,
		) => {
			const { metaobjectDefinitions } = await makeRequest(global.targetClient, {
				document: MetaobjectTypesDocument,
				variables: {
					first: 250,
				},
			})

			items.push(...metaobjectDefinitions.edges.map(({ node }) => node))

			if (metaobjectDefinitions.pageInfo.hasNextPage && metaobjectDefinitions.pageInfo.endCursor != null) {
				await getMetaobjects(items, metaobjectDefinitions.pageInfo.endCursor)
			}

			return items
		}

		const nodes = await getMetaobjects()

		return nodes.map(({ type }) => type)
	}

	private async getAllSourceMetaobjectsByType(type: string) {
		const getMetaobjects = async (items: Metaobjects = [], after?: string) => {
			const { metaobjects } = await makeRequest(global.sourceClient, {
				document: MetaobjectsDocument,
				variables: {
					type: type,
					first: 20,
					after,
				},
			})

			items.push(...metaobjects.edges.map(({ node }) => node))

			if (metaobjects.pageInfo.hasNextPage && metaobjects.pageInfo.endCursor != null) {
				await getMetaobjects(items, metaobjects.pageInfo.endCursor)
			}

			return items
		}

		return getMetaobjects()
	}
}
