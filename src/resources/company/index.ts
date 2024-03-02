import { CompanyByIdDocument, CompanyByIdentifierDocument, CompanyFragmentFragment } from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { AbstractBuilder, AbstractIdentifierBuilder, AbstractResource } from "../resource"
import { companiesCache } from "./cache"

export class Company extends AbstractResource<CompanyFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class CompanyBuilder extends AbstractBuilder<CompanyFragmentFragment, Company> {
	async _createOnTargetStore() {
		if (notEmpty(this.target)) return this.target

		throw new Error(`Cannot create ${this.resourceName} on target store`)
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const identifierBuilder = new CompanyIdentifierBuilder()

		const source = await makeRequest(client, {
			document: this.documents.getByIdentifier,
			variables: {
				query: identifierBuilder.toQuery(identifier),
			},
		})

		return source?.record?.nodes?.[0]
	}

	getIdentifierFromSource(source: CompanyFragmentFragment): string {
		const identifierBuilder = new CompanyIdentifierBuilder()

		return identifierBuilder.buildIdentifierFromParts(source)
	}

	get Resource() {
		return Company
	}

	get cache() {
		return companiesCache
	}

	get documents() {
		return {
			getByIdentifier: CompanyByIdentifierDocument,
			getById: CompanyByIdDocument,
		}
	}
}

export class CompanyIdentifierBuilder extends AbstractIdentifierBuilder<CompanyFragmentFragment> {
	toQuery(identifier: string) {
		return `name:${identifier}`
	}

	extractIdentifierFromSource(source: CompanyFragmentFragment) {
		return source.name
	}

	extractPartsFromIdentifier(identifier: string): ReturnType<CompanyIdentifierBuilder["extractIdentifierFromSource"]> {
		return identifier
	}
}
