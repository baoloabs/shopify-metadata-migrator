import fs from "fs"
import invariant from "tiny-invariant"
import { StagedUploadInput, StagedUploadsCreateDocument, StagedUploadsCreateMutation } from "../../generated/graphql"
import { Client, makeRequest } from "../graphql"
import { FileDownloader, Resource } from "./index"
import { logger } from "./logger"

type StagedTarget = NonNullable<
	NonNullable<StagedUploadsCreateMutation["stagedUploadsCreate"]>["stagedTargets"]
>[number]

export class StagedUploader {
	private readonly input: StagedUploadInput[]

	constructor(
		private readonly client: Client,
		input: StagedUploadInput | StagedUploadInput[],
	) {
		this.input = Array.isArray(input) ? input : [input]
	}

	async upload<T extends (stagedTarget: StagedTarget) => unknown>(
		file: string | URL,
		callback: T,
	): Promise<ReturnType<T>> {
		if (this.input.length > 1) {
			throw new Error(`Unable to upload multiple files at once. Please use the "bulkUpload" method instead`)
		}

		const [stagedTarget] = await this.createStagedUpload()

		const input = this.input[0]

		return this.uploadStagedTarget(stagedTarget, input, file, callback)
	}

	async bulkUpload<T extends (stagedTarget: StagedTarget) => unknown>(
		files: Array<string | URL>,
		callback: T,
	): Promise<Array<ReturnType<T>>> {
		if (this.input.length !== files.length) {
			throw new Error(
				`Unable to bulk upload because the number of files (${this.input.length}) does not match the number of resourceUrls (${files.length})`,
			)
		}

		const stagedUploads = await this.createStagedUpload()
		const returns: Array<Awaited<Promise<ReturnType<T>>>> = []

		for (let i = 0; i < stagedUploads.length; i++) {
			const input = this.input[i]
			const stagedTarget = stagedUploads[i]
			const file = files[i]

			invariant(input != null, "Unable to upload file input is null")
			invariant(stagedTarget != null, "Unable to upload file stagedTarget is null")
			invariant(file != null, "Unable to upload file resourceUrl is null")

			returns.push(await this.uploadStagedTarget(stagedTarget, input, file, callback))
		}

		return returns
	}

	async downloadResource(url: URL, filename: string) {
		return FileDownloader.download(url, filename)
	}

	private async getResourceAndFileLocation(file: string | URL, filename: string): Promise<Resource> {
		if (typeof file === "string") {
			return new Resource(fs.readFileSync(file), file)
		}

		return await this.downloadResource(file, filename)
	}

	private async createStagedUpload() {
		const stagedUpload = await makeRequest(this.client, {
			document: StagedUploadsCreateDocument,
			variables: {
				input: this.input,
			},
		})

		if ((stagedUpload?.stagedUploadsCreate?.userErrors?.length || 0) > 0) {
			logger.error(
				{
					errors: stagedUpload?.stagedUploadsCreate?.userErrors,
					stagedUpload,
				},
				"StagedUploader.createStagedUpload",
			)
		}

		invariant(
			stagedUpload?.stagedUploadsCreate?.stagedTargets != null,
			"Unable to create asset on target store because source has no stagedTarget",
		)

		return stagedUpload.stagedUploadsCreate.stagedTargets
	}

	private async uploadStagedTarget<T extends (stagedTarget: StagedTarget) => unknown>(
		stagedTarget: StagedTarget,
		stagedInput: StagedUploadInput,
		file: string | URL,
		callback: T,
	) {
		const { filename, mimeType } = stagedInput
		const resource = await this.getResourceAndFileLocation(file, filename)

		if (resource.file.length === 0) {
			throw new Error(
				`No file exists at ${resource.location}. Please use the "downloadResource" method before uploading`,
			)
		}

		const formData = new FormData()

		for (const { name, value } of stagedTarget.parameters) {
			formData.append(name, value)
		}

		formData.append("file", new Blob([resource.file], { type: mimeType }), filename)

		await (
			await fetch(stagedTarget.url, {
				method: "POST",
				body: formData,
			})
		).text()

		const returnValue = (await callback(stagedTarget)) as Awaited<Promise<ReturnType<T>>>

		// We only want to clean up downloaded files
		if (file instanceof URL) {
			resource.remove()
		}

		return returnValue
	}
}
