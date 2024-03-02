import invariant from "tiny-invariant"
import {
	CompanyLocationByIdDocument,
	CompanyLocationByIdentifierDocument,
	CompanyLocationFragmentFragment,
} from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { AbstractBuilder, AbstractIdentifierBuilder, AbstractResource } from "../resource"
import { companyLocationsCache } from "./cache"

export class CompanyLocation extends AbstractResource<CompanyLocationFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class CompanyLocationBuilder extends AbstractBuilder<CompanyLocationFragmentFragment, CompanyLocation> {
	async _createOnTargetStore() {
		if (notEmpty(this.target)) return this.target

		throw new Error(`Cannot create ${this.resourceName} on target store`)
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const source = await makeRequest(client, {
			document: this.documents.getByIdentifier,
			variables: {
				query: new CompanyLocationIdentifierBuilder().toQuery(identifier),
			},
		})

		return source?.record?.nodes?.[0]
	}

	getIdentifierFromSource(source: CompanyLocationFragmentFragment): string {
		const identifierBuilder = new CompanyLocationIdentifierBuilder()

		return identifierBuilder.buildIdentifierFromParts(source)
	}

	get Resource() {
		return CompanyLocation
	}

	get cache() {
		return companyLocationsCache
	}

	get documents() {
		return {
			getByIdentifier: CompanyLocationByIdentifierDocument,
			getById: CompanyLocationByIdDocument,
		}
	}
}

export class CompanyLocationIdentifierBuilder extends AbstractIdentifierBuilder<CompanyLocationFragmentFragment> {
	toQuery(identifier: string) {
		const parts = this.extractPartsFromIdentifier(identifier)

		return `company_id:${parts.companyId} AND external_id:${parts.externalId}`
	}

	extractIdentifierFromSource(source: CompanyLocationFragmentFragment) {
		invariant(source.externalId, "CompanyLocation must have an externalId")

		return {
			companyId: source.company.id,
			externalId: source.externalId,
		}
	}

	extractPartsFromIdentifier(
		identifier: string,
	): ReturnType<CompanyLocationIdentifierBuilder["extractIdentifierFromSource"]> {
		const searchParams = new URLSearchParams(identifier)
		const [companyId, externalId] = [searchParams.get("companyId"), searchParams.get("externalId")]

		invariant(companyId, "companyId must be present in identifier")
		invariant(externalId, "externalId must be present in identifier")

		return { companyId, externalId }
	}
}
