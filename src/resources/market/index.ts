import { MarketByIdDocument, MarketByIdentifierDocument, MarketFragmentFragment } from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { AbstractBuilder, AbstractIdentifierBuilder, AbstractResource } from "../resource"
import { marketsCache } from "./cache"

export class Market extends AbstractResource<MarketFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class MarketBuilder extends AbstractBuilder<MarketFragmentFragment, Market> {
	async _createOnTargetStore() {
		if (notEmpty(this.target)) return this.target

		throw new Error(`Cannot create ${this.resourceName} on target store`)
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const getMarkets = async (markets: MarketFragmentFragment[] = [], after?: string) => {
			const { records } = await makeRequest(client, {
				document: this.documents.getByIdentifier,
				variables: {
					after,
				},
			})

			markets.push(...records.nodes)

			if (records.pageInfo.hasNextPage && records.pageInfo.endCursor != null) {
				await getMarkets(markets, records.pageInfo.endCursor)
			}

			return markets
		}

		const markets = await getMarkets()

		return markets.find(market => this.getIdentifierFromSource(market) === identifier)
	}

	getIdentifierFromSource(source: MarketFragmentFragment): string {
		const identifierBuilder = new MarketIdentifierBuilder()

		return identifierBuilder.buildIdentifierFromParts(source)
	}

	get Resource() {
		return Market
	}

	get cache() {
		return marketsCache
	}

	get documents() {
		return {
			getByIdentifier: MarketByIdentifierDocument,
			getById: MarketByIdDocument,
		}
	}
}

export class MarketIdentifierBuilder extends AbstractIdentifierBuilder<MarketFragmentFragment> {
	extractIdentifierFromSource(source: MarketFragmentFragment) {
		return source.name
	}

	extractPartsFromIdentifier(identifier: string): ReturnType<MarketIdentifierBuilder["extractIdentifierFromSource"]> {
		return identifier
	}
}
