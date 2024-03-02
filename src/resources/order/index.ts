import invariant from "tiny-invariant"
import { OrderByIdDocument, OrderByIdentifierDocument, OrderFragmentFragment } from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { AbstractBuilder, AbstractIdentifierBuilder, AbstractResource } from "../resource"
import { ordersCache } from "./cache"

export class Order extends AbstractResource<OrderFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class OrderBuilder extends AbstractBuilder<OrderFragmentFragment, Order> {
	async _createOnTargetStore() {
		if (notEmpty(this.target)) return this.target

		throw new Error(`Cannot create ${this.resourceName} on target store`)
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const identifierBuilder = new OrderIdentifierBuilder()

		const source = await makeRequest(client, {
			document: this.documents.getByIdentifier,
			variables: {
				query: identifierBuilder.toQuery(identifier),
			},
		})

		return source?.record?.nodes?.[0]
	}

	getIdentifierFromSource(source: OrderFragmentFragment): string {
		const identifierBuilder = new OrderIdentifierBuilder()

		return identifierBuilder.buildIdentifierFromParts(source)
	}

	get Resource() {
		return Order
	}

	get cache() {
		return ordersCache
	}

	get documents() {
		return {
			getByIdentifier: OrderByIdentifierDocument,
			getById: OrderByIdDocument,
		}
	}
}

export class OrderIdentifierBuilder extends AbstractIdentifierBuilder<OrderFragmentFragment> {
	toQuery(identifier: string) {
		return `name:${identifier}`
	}

	extractIdentifierFromSource(source: OrderFragmentFragment) {
		invariant(source.name, `Unable to extract name from source ${JSON.stringify(source)}`)

		return source.name
	}

	extractPartsFromIdentifier(identifier: string): ReturnType<OrderIdentifierBuilder["extractIdentifierFromSource"]> {
		return identifier
	}
}
