import { BlogByIdDocument, BlogByIdentifierDocument, BlogFragmentFragment } from "../../../generated/graphql-storefront"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { AbstractBuilder, AbstractResource } from "../resource"
import { blogsCache } from "./cache"

export class Blog extends AbstractResource<BlogFragmentFragment> {
	get sourceId() {
		return this.source.id.replace("Blog", "OnlineStoreBlog")
	}

	get targetId() {
		return this.target.id.replace("Blog", "OnlineStoreBlog")
	}
}

export class BlogBuilder extends AbstractBuilder<BlogFragmentFragment, Blog> {
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
		return super._getOnSourceStoreById(sourceId.replace("OnlineStoreBlog", "Blog"))
	}

	getIdentifierFromSource(source: BlogFragmentFragment): string {
		return source.handle
	}

	get Resource() {
		return Blog
	}

	get cache() {
		return blogsCache
	}

	get documents() {
		return {
			getByIdentifier: BlogByIdentifierDocument,
			getById: BlogByIdDocument,
		}
	}
}
