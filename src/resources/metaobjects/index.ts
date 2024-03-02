import invariant from "tiny-invariant"
import {
	MetaobjectByIdDocument,
	MetaobjectByIdentifierDocument,
	MetaobjectFieldInput,
	MetaobjectFragmentFragment,
	MetaobjectStatus,
	MetaobjectUpsertDocument,
} from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { logger } from "../../utils/logger"
import { getReferenceValue } from "../factory"
import { AbstractBuilder, AbstractResource } from "../resource"
import { metaobjectsCache } from "./cache"

export class Metaobject extends AbstractResource<MetaobjectFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class MetaobjectBuilder extends AbstractBuilder<MetaobjectFragmentFragment, Metaobject> {
	async _createOnTargetStore(source: MetaobjectFragmentFragment): Promise<MetaobjectFragmentFragment> {
		if (notEmpty(this.target)) return this.target

		const fieldsToInitiallyPopulate: MetaobjectFieldInput[] = []

		const fields = source.fields.map(field => {
			return {
				key: field.key,
				value: field.value,
			}
		})

		const metaobjectDependentFields = fields.filter(field => {
			return field.value?.includes("gid://shopify/Metaobject")
		})
		const nonDependentFields = fields.filter(field => {
			return !metaobjectDependentFields.some(f => f.key === field.key)
		})

		for (const field of nonDependentFields) {
			fieldsToInitiallyPopulate.push({
				key: field.key,
				value: await getReferenceValue(field?.value ?? ""),
			})
		}

		const target = await makeRequest(global.targetClient, {
			document: this.documents.create,
			variables: {
				handle: {
					handle: source.handle,
					type: source.type,
				},
				metaobject: {
					capabilities: {
						publishable: {
							status: source.capabilities.publishable?.status ?? MetaobjectStatus.Draft,
						},
					},
					fields: fieldsToInitiallyPopulate,
				},
			},
		})

		logger.trace({ source })

		if ((target?.metaobjectUpsert?.userErrors?.length || 0) > 0) {
			logger.error(
				{
					errors: target?.metaobjectUpsert?.userErrors,
					source,
					target,
				},
				"MetaobjectBuilder._createOnTargetStore",
			)
		}

		invariant(target?.metaobjectUpsert?.metaobject != null, "Metaobject was not created")

		if (nonDependentFields.length === 0) {
			this.target = target.metaobjectUpsert.metaobject

			return this.target
		}

		const fieldsToNowPopulate: MetaobjectFieldInput[] = []

		for (const field of metaobjectDependentFields) {
			fieldsToNowPopulate.push({
				key: field.key,
				value: await getReferenceValue(field?.value ?? ""),
			})
		}

		const updatedTarget = await makeRequest(global.targetClient, {
			document: this.documents.update,
			variables: {
				handle: {
					handle: source.handle,
					type: source.type,
				},
				metaobject: {
					fields: fieldsToNowPopulate,
				},
			},
		})

		if ((updatedTarget?.metaobjectUpsert?.userErrors?.length || 0) > 0) {
			logger.error(
				{
					errors: updatedTarget?.metaobjectUpsert?.userErrors,
					target,
					source,
				},
				"MetaobjectBuilder._createOnTargetStore 2",
			)
		}

		invariant(updatedTarget?.metaobjectUpsert?.metaobject != null, "Metaobject was not created")

		this.target = updatedTarget.metaobjectUpsert.metaobject

		return this.target
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const { type, handle } = extractPartsFromMetaobjectIdentifier(identifier)

		const request = await makeRequest(client, {
			document: this.documents.getByIdentifier,
			variables: {
				handle: {
					type,
					handle,
				},
			},
		})

		return request.record
	}

	getIdentifierFromSource(source: MetaobjectFragmentFragment): string {
		return getMetaobjectIdentifier(source)
	}

	get Resource() {
		return Metaobject
	}

	get cache() {
		return metaobjectsCache
	}

	get documents() {
		return {
			getByIdentifier: MetaobjectByIdentifierDocument,
			getById: MetaobjectByIdDocument,
			create: MetaobjectUpsertDocument,
			update: MetaobjectUpsertDocument,
		}
	}
}

export function getMetaobjectIdentifier(source: MetaobjectFragmentFragment) {
	return new URLSearchParams({ type: source.type, handle: source.handle }).toString()
}

export function extractPartsFromMetaobjectIdentifier(identifier: string) {
	const searchParams = new URLSearchParams(identifier)
	const type = searchParams.get("type")
	const handle = searchParams.get("handle")

	if (type == null) {
		throw new Error(`Unable to extract type from identifier ${identifier}`)
	}

	if (handle == null) {
		throw new Error(`Unable to extract handle from identifier ${identifier}`)
	}

	return {
		type,
		handle,
	}
}
