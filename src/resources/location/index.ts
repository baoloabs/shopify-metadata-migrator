import {
	LocationByIdDocument,
	LocationByIdentifierDocument,
	LocationFragmentFragment,
} from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { AbstractBuilder, AbstractIdentifierBuilder, AbstractResource } from "../resource"
import { locationsCache } from "./cache"

export class Location extends AbstractResource<LocationFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class LocationBuilder extends AbstractBuilder<LocationFragmentFragment, Location> {
	async _createOnTargetStore() {
		if (notEmpty(this.target)) return this.target

		throw new Error(`Cannot create ${this.resourceName} on target store`)
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const source = await makeRequest(client, {
			document: this.documents.getByIdentifier,
			variables: {
				query: new LocationIdentifierBuilder().toQuery(identifier),
			},
		})

		return source?.record?.nodes?.[0]
	}

	getIdentifierFromSource(source: LocationFragmentFragment): string {
		const identifierBuilder = new LocationIdentifierBuilder()

		return identifierBuilder.buildIdentifierFromParts(source)
	}

	get Resource() {
		return Location
	}

	get cache() {
		return locationsCache
	}

	get documents() {
		return {
			getByIdentifier: LocationByIdentifierDocument,
			getById: LocationByIdDocument,
		}
	}
}

export class LocationIdentifierBuilder extends AbstractIdentifierBuilder<LocationFragmentFragment> {
	toQuery(identifier: string) {
		return `name:${identifier}`
	}

	extractIdentifierFromSource(source: LocationFragmentFragment) {
		return source.name
	}

	extractPartsFromIdentifier(identifier: string): ReturnType<LocationIdentifierBuilder["extractIdentifierFromSource"]> {
		return identifier
	}
}
