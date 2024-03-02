import invariant from "tiny-invariant"
import {
	CollectionByIdDocument,
	CollectionByIdentifierDocument,
	CollectionCreateDocument,
	CollectionFragmentFragment,
} from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { logger } from "../../utils/logger"
import { AbstractBuilder, AbstractResource } from "../resource"
import { collectionsCache } from "./cache"
import { addProductsToCollection, getCustomCollectionInput, getSmartCollectionInput } from "./utils"

export class Collection extends AbstractResource<CollectionFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class CollectionBuilder extends AbstractBuilder<CollectionFragmentFragment, Collection> {
	async _createOnTargetStore(source: CollectionFragmentFragment) {
		if (notEmpty(this.target)) return this.target

		const isSmartCollection = source.ruleSet != null

		const target = isSmartCollection
			? await this.#createSmartCollection(source)
			: await this.#createCustomCollection(source)

		invariant(target)

		this.target = target

		return target
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

	getIdentifierFromSource(source: CollectionFragmentFragment) {
		return source.handle
	}

	get Resource() {
		return Collection
	}

	get cache() {
		return collectionsCache
	}

	get documents() {
		return {
			getByIdentifier: CollectionByIdentifierDocument,
			getById: CollectionByIdDocument,
			create: CollectionCreateDocument,
		}
	}

	async #createSmartCollection(source: CollectionFragmentFragment): Promise<CollectionFragmentFragment> {
		const collectionInput = await getSmartCollectionInput(source)
		const target = await makeRequest(global.targetClient, {
			document: this.documents.create,
			variables: {
				input: collectionInput,
			},
		})

		if ((target?.collectionCreate?.userErrors?.length || 0) > 0) {
			logger.error(
				{
					errors: target?.collectionCreate?.userErrors,
					target,
					source,
					variables: {
						input: collectionInput,
					},
				},
				"CollectionBuilder.#createSmartCollection ",
			)
		}

		invariant(target?.collectionCreate?.collection)

		return target.collectionCreate.collection
	}

	async #createCustomCollection(source: CollectionFragmentFragment): Promise<CollectionFragmentFragment> {
		const collectionInput = getCustomCollectionInput(source)
		const target = await makeRequest(global.targetClient, {
			document: this.documents.create,
			variables: {
				input: collectionInput,
			},
		})

		if ((target?.collectionCreate?.userErrors?.length || 0) > 0) {
			logger.error(
				{
					errors: target?.collectionCreate?.userErrors,
					target,
					source,
				},
				"CollectionBuilder.#createCustomCollection",
			)
		}

		invariant(target?.collectionCreate?.collection)

		if (source.productsCount === 0) {
			return target.collectionCreate.collection
		}

		await addProductsToCollection(target.collectionCreate.collection.id, source.id)

		return target.collectionCreate.collection
	}
}
