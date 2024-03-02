import { PageByIdDocument, PageByIdentifierDocument, PageFragmentFragment } from "../../../generated/graphql-storefront"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { AbstractBuilder, AbstractResource } from "../resource"
import { pagesCache } from "./cache"

export class Page extends AbstractResource<PageFragmentFragment> {
	get sourceId() {
		return this.source.id.replace("Page", "OnlineStorePage")
	}

	get targetId() {
		return this.target.id.replace("Page", "OnlineStorePage")
	}
}

export class PageBuilder extends AbstractBuilder<PageFragmentFragment, Page> {
	storefront = true

	async _createOnTargetStore() {
		if (notEmpty(this.target)) return this.target

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

	async _getOnSourceStoreById(sourceId: string) {
		return super._getOnSourceStoreById(sourceId.replace("OnlineStorePage", "Page"))
	}

	getIdentifierFromSource(source: PageFragmentFragment): string {
		return source.handle
	}

	get Resource() {
		return Page
	}

	get cache() {
		return pagesCache
	}

	get documents() {
		return {
			getByIdentifier: PageByIdentifierDocument,
			getById: PageByIdDocument,
		}
	}
}
