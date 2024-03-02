import invariant from "tiny-invariant"
import {
	ArticleByIdDocument,
	ArticleByIdentifierDocument,
	ArticleFragmentFragment,
} from "../../../generated/graphql-storefront"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { logger } from "../../utils/logger"
import { AbstractBuilder, AbstractIdentifierBuilder, AbstractResource } from "../resource"
import { articlesCache } from "./cache"

export class Article extends AbstractResource<ArticleFragmentFragment> {
	get sourceId() {
		return this.source.id.replace("Article", "OnlineStoreArticle")
	}

	get targetId() {
		return this.target.id.replace("Article", "OnlineStoreArticle")
	}
}

export class ArticleBuilder extends AbstractBuilder<ArticleFragmentFragment, Article> {
	storefront = true

	async _createOnTargetStore(source: ArticleFragmentFragment) {
		if (notEmpty(this.target)) return this.target

		logger.trace({ source })

		throw new Error(`Cannot create ${this.resourceName} on target store`)
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const identifierBuilder = new ArticleIdentifierBuilder()
		const { handle, blogTitle } = identifierBuilder.extractPartsFromIdentifier(identifier)

		const getArticles = async (items: ArticleFragmentFragment[] = [], after?: string) => {
			const { articles } = await makeRequest(client, {
				document: this.documents.getByIdentifier,
				variables: {
					first: 50,
					after,
				},
			})

			items.push(...articles.nodes)

			if (articles.pageInfo.hasNextPage && articles.pageInfo.endCursor != null) {
				await getArticles(items, articles.pageInfo.endCursor)
			}

			return items
		}

		const articles = await getArticles()

		return articles.find(article => article.handle === handle && article.blog.title === blogTitle)
	}

	async _getOnSourceStoreById(sourceId: string) {
		return super._getOnSourceStoreById(sourceId.replace("OnlineStoreArticle", "Article"))
	}

	getIdentifierFromSource(source: ArticleFragmentFragment): string {
		const identifierBuilder = new ArticleIdentifierBuilder()

		return identifierBuilder.buildIdentifierFromParts(source)
	}

	get Resource() {
		return Article
	}

	get cache() {
		return articlesCache
	}

	get documents() {
		return {
			getByIdentifier: ArticleByIdentifierDocument,
			getById: ArticleByIdDocument,
		}
	}
}

export class ArticleIdentifierBuilder extends AbstractIdentifierBuilder<ArticleFragmentFragment> {
	toQuery(identifier: string) {
		return `email:${identifier}`
	}

	extractIdentifierFromSource(source: ArticleFragmentFragment) {
		invariant(source.handle, `Unable to extract handle from source ${JSON.stringify(source)}`)

		return {
			handle: source.handle,
			blogTitle: source.blog.title,
		}
	}

	extractPartsFromIdentifier(identifier: string): ReturnType<ArticleIdentifierBuilder["extractIdentifierFromSource"]> {
		const searchParams = new URLSearchParams(identifier)
		const [handle, blogTitle] = [searchParams.get("handle"), searchParams.get("blogTitle")]

		invariant(handle, "handle must be present in identifier")
		invariant(blogTitle, "blogTitle must be present in identifier")

		return { handle, blogTitle }
	}
}
