import invariant from "tiny-invariant"
import {
	CustomerByIdDocument,
	CustomerByIdentifierDocument,
	CustomerFragmentFragment,
} from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { AbstractBuilder, AbstractIdentifierBuilder, AbstractResource } from "../resource"
import { customersCache } from "./cache"

export class Customer extends AbstractResource<CustomerFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class CustomerBuilder extends AbstractBuilder<CustomerFragmentFragment, Customer> {
	async _createOnTargetStore() {
		if (notEmpty(this.target)) return this.target

		throw new Error(`Cannot create ${this.resourceName} on target store`)
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const identifierBuilder = new CustomerIdentifierBuilder()

		const source = await makeRequest(client, {
			document: this.documents.getByIdentifier,
			variables: {
				query: identifierBuilder.toQuery(identifier),
			},
		})

		return source?.record?.nodes?.[0]
	}

	getIdentifierFromSource(source: CustomerFragmentFragment): string {
		const identifierBuilder = new CustomerIdentifierBuilder()

		return identifierBuilder.buildIdentifierFromParts(source)
	}

	get Resource() {
		return Customer
	}

	get cache() {
		return customersCache
	}

	get documents() {
		return {
			getByIdentifier: CustomerByIdentifierDocument,
			getById: CustomerByIdDocument,
		}
	}
}

export class CustomerIdentifierBuilder extends AbstractIdentifierBuilder<CustomerFragmentFragment> {
	toQuery(identifier: string) {
		return `email:${identifier}`
	}

	extractIdentifierFromSource(source: CustomerFragmentFragment) {
		invariant(source.email, `Unable to extract email from source ${JSON.stringify(source)}`)

		return source.email
	}

	extractPartsFromIdentifier(identifier: string): ReturnType<CustomerIdentifierBuilder["extractIdentifierFromSource"]> {
		return identifier
	}
}
