import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core"
import chalk from "chalk"
import { Logger } from "pino"
import invariant from "tiny-invariant"
import { MetafieldOwnerType } from "../../generated/graphql"
import { Client, makeRequest } from "../graphql"
import { notEmpty } from "../utils"
import { logger } from "../utils/logger"

export abstract class AbstractResource<Fragment> {
	constructor(
		readonly identifier: string,
		readonly source: Fragment,
		readonly target: Fragment,
	) {}

	abstract get sourceId(): string

	abstract get targetId(): string
}

export abstract class AbstractCache<Resource extends AbstractResource<any>> {
	private cache: Map<string, Resource>

	constructor() {
		this.cache = new Map([])
	}

	has(key: string) {
		return this.cache.has(key)
	}

	get(key: string) {
		return this.cache.get(key)
	}

	set(key: string, value: Resource) {
		this.cache.set(key, value)
	}

	values() {
		return this.cache.values()
	}
}

export abstract class AbstractBuilder<Fragment, R extends AbstractResource<any>> {
	storefront = false
	source: Fragment | undefined
	target: Fragment | undefined

	identifier?: string
	sourceId?: string
	ownerType: MetafieldOwnerType | string | undefined
	private logger: Logger
	private messages: string[] = []

	constructor({
		source,
		target,
		identifier,
		sourceId,
		ownerType,
	}: {
		source?: Fragment | undefined
		target?: Fragment | undefined
		identifier?: string
		sourceId?: string
		ownerType?: MetafieldOwnerType | string
	}) {
		if (typeof identifier === "undefined" && typeof sourceId === "undefined") {
			throw new Error(`Cannot build ${this.resourceName} without either an identifier or sourceId`)
		}

		this.source = source
		this.target = target

		this.identifier = identifier
		this.sourceId = sourceId
		this.ownerType = ownerType
		this.logger = logger.child({})
	}

	async build(bypassCache = false) {
		this.messages.push(
			`├── Trying to build ${chalk.yellow(this.resourceName)} with ${
				this.identifier ? "identifier" : "sourceId"
			} ${chalk.magenta(this.identifier ?? this.sourceId)}`,
		)

		const instance = await (async () => {
			if (this.source && this.target) {
				this.messages.push("│   └── Found both target and source")

				const key = notEmpty(this.identifier) ? this.identifier : this.getIdentifierFromSource(this.source)

				const instance = new this.Resource(key, this.source, this.target)

				this.cache.set(key, instance)

				return instance
			}

			if (notEmpty(this.identifier)) {
				this.messages.push("│   ├── by identifier")

				return this.buildByIdentifier(this.identifier, { bypassCache })
			}
			invariant(this.sourceId, `Cannot build ${this.resourceName} without sourceId`)

			this.messages.push("│   ├── by source id")

			return this.buildBySourceId(this.sourceId, { bypassCache })
		})()

		for (const message of this.messages) {
			this.logger.info(message)
		}

		return instance
	}

	async buildByIdentifier(identifier: string, { bypassCache = false }) {
		if (!bypassCache && this.cache.has(identifier)) {
			this.messages.push("│   │   └── Found in cache")

			const item = this.cache.get(identifier)

			if (item) return item
		}

		if (await this._existsOnTargetStore(identifier)) {
			const source = await this._getOnSourceStoreByIdentifier(identifier)
			const target = await this._getOnTargetStoreByIdentifier(identifier)

			const instance = new this.Resource(identifier, source, target)
			this.cache.set(identifier, instance)

			this.messages.push("│   │   └── Found in existing store and added to cache")

			return instance
		}

		this.messages.push(`│   │   ├── ${chalk.cyan("Trying to transfer from source to target")}`)

		const source = await this._getOnSourceStoreByIdentifier(identifier)
		const target = await this._createOnTargetStore(source)

		const instance = new this.Resource(identifier, source, target)
		this.cache.set(identifier, instance)

		this.messages.push(`│   │   └── ${chalk.green("Transferred from source to target and added to cache")}`)

		return instance
	}

	async buildBySourceId(sourceId: string, { bypassCache = false }) {
		if (!bypassCache) {
			const definitions = Array.from(this.cache.values())
			const definition = definitions.find(definition => definition.sourceId === sourceId)

			if (notEmpty(definition)) {
				this.messages.push("│   │   └── Found in cache")
				return definition
			}
		}

		const source = await this._getOnSourceStoreById(sourceId)
		const identifier = this.getIdentifierFromSource(source)

		return this.buildByIdentifier(identifier, { bypassCache })
	}

	async _existsOnTargetStore(identifier: string) {
		const result = await this._getOnTargetStoreByIdentifier(identifier)

		return notEmpty(result)
	}

	async _getOnTargetStoreByIdentifier(identifier: string) {
		if (notEmpty(this.target)) {
			return this.target
		}

		const target = await this._makeByIdentifierRequest(this.targetClient, identifier)

		if (notEmpty(target)) {
			this.target = target

			return this.target
		}

		return target
	}

	async _getOnSourceStoreByIdentifier(identifier: string) {
		if (notEmpty(this.source)) {
			return this.source
		}

		const source = await this._makeByIdentifierRequest(this.sourceClient, identifier)

		if (!notEmpty(source)) {
			throw new Error(`Cannot find ${this.resourceName} with identifier ${identifier} on source store`)
		}

		this.source = source

		return this.source
	}

	async _getOnSourceStoreById(sourceId: string) {
		if (notEmpty(this.source)) {
			return this.source
		}

		const source = await this._makeByIdRequest(this.sourceClient, sourceId)

		if (!notEmpty(source)) {
			throw new Error(`Cannot find ${this.resourceName} with id ${sourceId} on source store`)
		}

		if (typeof source === "undefined") {
			throw new Error(`Cannot find ${this.resourceName} with id ${sourceId} on source store`)
		}

		this.source = source as Fragment

		return this.source
	}

	async _makeByIdRequest(client: Client, id: string) {
		const source = await makeRequest(client, {
			document: this.documents.getById,
			variables: {
				id,
			},
		})

		return source.record
	}

	abstract _createOnTargetStore(source: Fragment): Promise<Fragment>

	abstract _makeByIdentifierRequest(client: Client, identifier: string): Promise<Fragment | null | undefined>

	abstract getIdentifierFromSource(source: Fragment): string

	abstract get Resource(): new (
		...args: any[]
	) => R
	abstract get cache(): AbstractCache<R>
	abstract get documents(): {
		getByIdentifier: DocumentNode<any, any>
		getById: DocumentNode<any, any>
		create?: DocumentNode<any, any>
	}

	get resourceName() {
		return this.Resource.name
	}

	get sourceClient() {
		return this.storefront ? global.sourceStorefrontClient : global.sourceClient
	}

	get targetClient() {
		return this.storefront ? global.targetStorefrontClient : global.targetClient
	}
}

export type IdentifierParts = Record<string, string> | string

export abstract class AbstractIdentifierBuilder<Fragment> {
	buildIdentifierFromParts(source: Fragment) {
		const parts = this.extractIdentifierFromSource(source)

		return new URLSearchParams(parts).toString()
	}

	abstract extractIdentifierFromSource(source: Fragment): IdentifierParts

	abstract extractPartsFromIdentifier(
		identifier: string,
	): ReturnType<AbstractIdentifierBuilder<Fragment>["extractIdentifierFromSource"]>
}
