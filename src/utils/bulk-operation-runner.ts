import invariant from "tiny-invariant"
import {
	BulkOperationFragmentFragment,
	BulkOperationRunMutationDocument,
	BulkOperationRunQueryDocument,
	BulkOperationStatus,
	BulkOperationType,
	CurrentBulkOperationDocument,
	CurrentBulkOperationQuery,
	StagedUploadHttpMethodType,
	StagedUploadTargetGenerateUploadResource,
} from "../../generated/graphql"
import { Client, makeRequest } from "../graphql"
import { ResourceName } from "../types"
import { Resource } from "./index"
import { logger } from "./logger"
import { StagedUploader } from "./staged-upload"

abstract class BulkOperationRunner {
	abstract type: BulkOperationType

	constructor(
		protected readonly resourceName: ResourceName,
		protected readonly bulkOperation: string,
		protected readonly client: Client,
	) {}

	public async execute(...args: any[]): Promise<BulkOperationFragmentFragment> {
		logger.info({ operation: this.bulkOperation }, `Submitting ${this.resourceName.plural} bulk operation`)
		await this.run(this.client, ...args)

		return await this.pollBulkOperation()
	}

	protected abstract run(client: Client, ...args: any[]): Promise<BulkOperationFragmentFragment>

	private async pollBulkOperation(
		client: Client = this.client,
	): Promise<NonNullable<CurrentBulkOperationQuery["currentBulkOperation"]>> {
		logger.info(`Polling ${this.resourceName.plural} bulk operation`)

		const { currentBulkOperation } = await makeRequest(client, {
			document: CurrentBulkOperationDocument,
			variables: {
				type: this.type,
			},
		})

		if (currentBulkOperation?.status === BulkOperationStatus.Completed) {
			return currentBulkOperation
		}

		if (currentBulkOperation?.status === BulkOperationStatus.Failed) {
			throw new Error(`Bulk operation failed: ${currentBulkOperation?.errorCode}`)
		}

		await new Promise(resolve => setTimeout(resolve, 1000))

		return this.pollBulkOperation(client)
	}
}

export class BulkOperationQueryRunner extends BulkOperationRunner {
	type = BulkOperationType.Query

	protected async run(client: Client) {
		const query = await makeRequest(client, {
			document: BulkOperationRunQueryDocument,
			variables: {
				query: this.bulkOperation,
			},
		})

		if ((query?.bulkOperationRunQuery?.userErrors?.length || 0) > 0) {
			logger.error(
				{
					errors: query?.bulkOperationRunQuery?.userErrors,
					query,
				},
				"BulkOperationQueryRunner.run",
			)
		}

		invariant(query.bulkOperationRunQuery?.bulkOperation)

		if (query.bulkOperationRunQuery.bulkOperation.status === BulkOperationStatus.Created) {
			return query.bulkOperationRunQuery.bulkOperation
		}

		throw new Error(`Bulk operation failed: ${query.bulkOperationRunQuery?.bulkOperation?.status}`)
	}
}

export class BulkOperationMutationRunner extends BulkOperationRunner {
	type = BulkOperationType.Mutation

	public async execute(resource: Resource): Promise<BulkOperationFragmentFragment> {
		return super.execute(resource)
	}

	protected async run(client: Client, resource: Resource): Promise<BulkOperationFragmentFragment> {
		const stagedUploader = new StagedUploader(client, {
			filename: resource.filename,
			resource: StagedUploadTargetGenerateUploadResource.BulkMutationVariables,
			mimeType: "text/jsonl",
			httpMethod: StagedUploadHttpMethodType.Post,
		})

		return await stagedUploader.upload(resource.location, async stagedTarget => {
			const stagedUploadPath = stagedTarget.parameters.find(parameter => parameter.name === "key")?.value
			invariant(stagedUploadPath)

			const target = await makeRequest(client, {
				document: BulkOperationRunMutationDocument,
				variables: {
					mutation: this.bulkOperation,
					stagedUploadPath,
				},
			})

			if ((target?.bulkOperationRunMutation?.userErrors?.length || 0) > 0) {
				logger.error(
					{
						errors: target?.bulkOperationRunMutation?.userErrors,
						target,
					},
					"BulkOperationMutationRunner.run",
				)
			}

			invariant(target.bulkOperationRunMutation?.bulkOperation)

			logger.info("Submitted bulk import")

			return target.bulkOperationRunMutation.bulkOperation
		})
	}
}
