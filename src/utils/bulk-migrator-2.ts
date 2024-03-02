import { Node } from "../../generated/graphql"
import { Client } from "../graphql"
import { BaseBulkMigratorOptions, ResourceName, baseBulkMigratorOptions } from "../types"
import { createBulkMutationResourceFromData } from "./bulk-migrator"
import { BulkOperationMutationRunner } from "./bulk-operation-runner"
import { FileDownloader } from "./index"
import { logger } from "./logger"

export type OperationValue<Datum extends Node> = {
	source: Datum
	target: Datum | null
}
export type OperationResult<Datum extends Node> = Map<string, OperationValue<Datum>>

export abstract class BulkMigrator<Datum extends Node, QueryData extends Map<Datum["id"], Datum>> {
	constructor(
		protected readonly resourceName: ResourceName,
		protected readonly createMutation: string,
		protected readonly updateMutation: string,
		protected readonly options: BaseBulkMigratorOptions = baseBulkMigratorOptions,
	) {}

	public async migrate() {
		const [sourceData, targetData] = await Promise.all([
			this.getData(global.sourceClient),
			this.getData(global.targetClient),
		])

		const operationChanges = this.getOperationChanges(sourceData, targetData)

		if (operationChanges.create.size > 0) {
			await this.createData(operationChanges.create)
		}

		if (operationChanges.update.size > 0) {
			await this.updateData(operationChanges.update)
		}
	}

	abstract getData(client: Client): Promise<QueryData>

	protected getOperationChanges(
		sourceData: QueryData,
		targetData: QueryData,
	): {
		create: OperationResult<Datum>
		update: OperationResult<Datum>
		delete: OperationResult<Datum>
		same: OperationResult<Datum>
	} {
		const sourceValues = Array.from(sourceData.values())
		const targetValues = Array.from(targetData.values())

		const operationChanges = sourceValues.reduce<{
			create: OperationResult<Datum>
			update: OperationResult<Datum>
			delete: OperationResult<Datum>
			same: OperationResult<Datum>
		}>(
			(acc, sourceData) => {
				const targetData = this.findTargetData(sourceData, targetValues)

				if (!targetData) {
					acc.create.set(this.getDatumKey(sourceData), {
						source: sourceData,
						target: null,
					})

					return acc
				}

				if (!this.deeplyCompareData(sourceData, targetData)) {
					acc.update.set(this.getDatumKey(sourceData), {
						source: sourceData,
						target: targetData,
					})

					return acc
				}

				acc.same.set(this.getDatumKey(sourceData), {
					source: sourceData,
					target: targetData,
				})

				return acc
			},
			{
				create: new Map<string, OperationValue<Datum>>(),
				update: new Map<string, OperationValue<Datum>>(),
				delete: new Map<string, OperationValue<Datum>>(),
				same: new Map<string, OperationValue<Datum>>(),
			},
		)

		logger.info(
			{
				create: operationChanges.create.size,
				update: operationChanges.update.size,
				delete: operationChanges.delete.size,
				same: operationChanges.same.size,
			},
			`Found ${this.resourceName.plural}`,
		)

		return operationChanges
	}

	async createData(data: Map<string, OperationValue<Datum>>): Promise<void> {
		logger.info(`Creating ${data.size} ${this.resourceName.plural}`)

		const mutationResource = await createBulkMutationResourceFromData(
			data,
			`create-${this.resourceName.plural}.jsonl`,
			this.transformCreateData,
		)

		const bulkMutationRunner = new BulkOperationMutationRunner(
			this.resourceName,
			this.createMutation,
			global.targetClient,
		)
		const finishedBulkMutation = await bulkMutationRunner.execute(mutationResource)

		const resource = await FileDownloader.download(
			finishedBulkMutation.url,
			`bulk-${this.resourceName.single}-migrator-create-${this.resourceName.plural}.jsonl`,
		)

		logger.info({ finishedBulkMutation }, `Finished bulk import. You can find it at ${resource.location}`)
	}

	async updateData(data: Map<string, OperationValue<Datum>>): Promise<void> {
		logger.info(`Updating ${data.size} ${this.resourceName.plural}`)

		const mutationResource = await createBulkMutationResourceFromData(
			data,
			`update-${this.resourceName.plural}.jsonl`,
			this.transformUpdateData,
		)

		const bulkMutationRunner = new BulkOperationMutationRunner(
			this.resourceName,
			this.updateMutation,
			global.targetClient,
		)
		const finishedBulkMutation = await bulkMutationRunner.execute(mutationResource)

		const resource = await FileDownloader.download(
			finishedBulkMutation.url,
			`bulk-${this.resourceName.single}-migrator-update-${this.resourceName.plural}.jsonl`,
		)

		logger.info({ finishedBulkMutation }, `Finished bulk import. You can find it at ${resource.location}`)
	}

	abstract findTargetData(sourceData: Datum, targetData: Datum[]): Datum | undefined

	abstract getDatumKey(datum: Datum): string

	abstract deeplyCompareData(sourceData: Datum, targetData: Datum): boolean

	abstract transformCreateData(
		data: OperationValue<Datum>,
	): object | Array<any> | null | Promise<object | Array<any> | null>

	abstract transformUpdateData(
		data: OperationValue<Datum>,
	): object | Array<any> | null | Promise<object | Array<any> | null>
}
