import fs from "fs"
import readline from "readline"
import { Node } from "../../generated/graphql"
import { PossibleBaseLines } from "../types"
import { Resource } from "./index"

type Options = {
	filename: string
}

export class BulkOperationResultTransformer<Line extends PossibleBaseLines<Data>, Data extends Node> {
	data: Map<Data["id"], Data>

	constructor(
		private readonly resource: Resource,
		private lineTransformer: (line: Line, data: Map<Data["id"], Data>) => { key: string; value: Data },
		{
			initialData = new Map([]),
		}: {
			initialData?: Map<Data["id"], Data>
			options?: Partial<Options>
		} = {},
	) {
		this.data = initialData
	}

	async transform() {
		await this.processData()

		return this.data
	}

	private async processData(): Promise<Map<Data["id"], Data>> {
		try {
			const fileStream = fs.createReadStream(this.resource.location)
			const rl = readline.createInterface({
				input: fileStream,
				crlfDelay: Infinity,
			})

			for await (const line of rl) {
				const { key, value } = this.lineTransformer(JSON.parse(line) as Line, this.data)

				this.data.set(key, value)
			}

			return this.data
		} catch (e: any) {
			throw new Error(e)
		}
	}
}
