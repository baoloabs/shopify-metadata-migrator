import { Node } from "../../generated/graphql"
import { Client } from "../graphql"
import { BulkImportResultLine, BulkOperationQueryLine, PossibleBaseLines, ResourceName } from "../types"
import { BulkOperationResultTransformer } from "./bulk-operation-result-transformer"
import { BulkOperationQueryRunner } from "./bulk-operation-runner"
import { fileCache } from "./file-cache"
import { FileDownloader, Resource, cyrb53 } from "./index"
import { log } from "./log"

export class BulkQuery<
	Line extends PossibleBaseLines<Data>,
	Data extends Node,
	ReturnValue extends { key: string; value: Data },
> {
	fileName: string

	constructor(
		private readonly query: string,
		private readonly client: Client,
		private readonly resourceName: ResourceName,
		private readonly forceFresh = true,
	) {
		this.fileName = `${cyrb53(JSON.stringify({ query, endpoint: client.endpoint }))}.jsonl`
	}

	async run(transform: (line: Line, data: Map<Data["id"], Data>) => ReturnValue) {
		const resource = await this.getResource()
		if (resource === null) {
			return new Map<Data["id"], Data>()
		}

		return new BulkOperationResultTransformer(resource, transform).transform()
	}

	private async getResource(): Promise<Resource | null> {
		if (!this.forceFresh && fileCache.has(this.fileName)) {
			const resource = fileCache.get(this.fileName)

			if (resource) {
				return resource
			}
		}

		const bulkQueryRunner = new BulkOperationQueryRunner(this.resourceName, this.query, this.client)
		const finishedBulkQuery = await bulkQueryRunner.execute()

		if (finishedBulkQuery.url == null) {
			return null
		}

		const resource = await FileDownloader.download(finishedBulkQuery.url, this.fileName)

		fileCache.set(this.fileName, resource.file.toString())

		return resource
	}
}
