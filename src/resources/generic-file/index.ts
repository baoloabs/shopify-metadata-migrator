import * as fs from "fs"
import * as path from "path"
import * as stream from "stream"
import invariant from "tiny-invariant"
import {
	FileContentType,
	FileStatus,
	GenericFileByIdDocument,
	GenericFileByIdentifierDocument,
	GenericFileCreateDocument,
	GenericFileFragmentFragment,
	GenericFileReadyDocument,
	StagedUploadHttpMethodType,
	StagedUploadTargetGenerateUploadResource,
	StagedUploadsCreateDocument,
} from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { logger } from "../../utils/logger"
import { AbstractBuilder, AbstractIdentifierBuilder, AbstractResource, IdentifierParts } from "../resource"
import { genericFilesCache } from "./cache"

export class GenericFile extends AbstractResource<GenericFileFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class GenericFileBuilder extends AbstractBuilder<GenericFileFragmentFragment, GenericFile> {
	async _createOnTargetStore(source: GenericFileFragmentFragment) {
		if (notEmpty(this.target)) return this.target

		const { filename } = new GenericFileIdentifierBuilder().extractPartsFromIdentifier(
			this.getIdentifierFromSource(source),
		)

		invariant(source.mimeType != null, "Unable to create generic file on target store because source has no mimeType")
		invariant(
			source.originalFileSize != null,
			"Unable to create generic file on target store because source has no fileSize",
		)
		invariant(source.url != null, "Unable to create generic file on target store because source has no url")

		const stagedUpload = await makeRequest(global.targetClient, {
			document: StagedUploadsCreateDocument,
			variables: {
				input: [
					{
						filename,
						httpMethod: StagedUploadHttpMethodType.Post,
						mimeType: source.mimeType,
						resource: StagedUploadTargetGenerateUploadResource.File,
						fileSize: source.originalFileSize.toString(),
					},
				],
			},
		})

		const stagedTarget = stagedUpload?.stagedUploadsCreate?.stagedTargets?.[0]

		invariant(stagedTarget != null, "Unable to create generic file on target store because source has no stagedTarget")

		const downloadLocation = path.join(global.tmpDirectory, filename)

		await downloadGenericFile(downloadLocation, source.url)

		const formData = new FormData()

		for (const { name, value } of stagedTarget.parameters) {
			formData.append(name, value)
		}

		formData.append("file", new Blob([fs.readFileSync(downloadLocation)], { type: source.mimeType }))

		const uploadResponse = await (
			await fetch(stagedTarget.url, {
				method: "POST",
				body: formData,
			})
		).text()

		const target = await makeRequest(global.targetClient, {
			document: GenericFileCreateDocument,
			variables: {
				input: {
					alt: source.alt,
					contentType: FileContentType.File,
					originalSource: stagedTarget.resourceUrl,
				},
			},
		})

		if ((target?.fileCreate?.userErrors?.length || 0) > 0) {
			logger.error(
				{
					errors: target?.fileCreate?.userErrors,
					target,
					source,
				},
				"GenericFileBuilder._createOnTargetStore ",
			)
		}

		const file = target?.fileCreate?.files?.[0]

		invariant(
			file?.__typename === "GenericFile",
			"Unable to create generic file on target store because source has no file",
		)

		fs.unlinkSync(downloadLocation)

		if (file.fileStatus !== FileStatus.Ready) {
			this.target = await this.getReadyGenericFile(file.id)

			return this.target
		}

		throw new Error("Unable to create generic file on target store")
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const result = await makeRequest(client, {
			document: GenericFileByIdentifierDocument,
			variables: {
				query: new GenericFileIdentifierBuilder().toQuery(identifier),
			},
		})

		const node = result?.record?.edges?.[0]?.node

		if (node?.__typename === "GenericFile") {
			return node
		}

		return null
	}

	getIdentifierFromSource(source: GenericFileFragmentFragment): string {
		return new GenericFileIdentifierBuilder().buildIdentifierFromParts(source)
	}

	private async getReadyGenericFile(id: string): Promise<GenericFileFragmentFragment> {
		const result = await makeRequest(global.targetClient, {
			document: GenericFileReadyDocument,
			variables: {
				id,
			},
		})

		invariant(
			result?.record?.__typename === "GenericFile",
			"Unable to get ready generic file because node is not a generic file",
		)

		if (result.record.fileStatus !== FileStatus.Ready) {
			return this.getReadyGenericFile(id)
		}

		return result.record
	}

	get Resource() {
		return GenericFile
	}

	get cache() {
		return genericFilesCache
	}

	get documents() {
		return {
			getByIdentifier: GenericFileByIdentifierDocument,
			getById: GenericFileByIdDocument,
			create: GenericFileCreateDocument,
		}
	}
}

class GenericFileIdentifierBuilder extends AbstractIdentifierBuilder<GenericFileFragmentFragment> {
	toQuery(identifier: string) {
		const { filename, originalUploadSize } = this.extractPartsFromIdentifier(identifier)

		return `filename:${filename} AND original_upload_size:${originalUploadSize} AND media_type:VIDEO AND status:ready`
	}

	extractIdentifierFromSource(source: GenericFileFragmentFragment): IdentifierParts {
		invariant(
			source.originalFileSize != null,
			`Unable to extract identifier from generic file ${source.id} because it has no originalSource`,
		)

		invariant(
			source.url != null,
			`Unable to extract identifier from generic file ${source.id} because it has no originalSource`,
		)

		const url = new URL(source.url)
		const pathnameParts = url.pathname.split("/")
		const filename = pathnameParts[pathnameParts.length - 1]

		return {
			filename,
			originalUploadSize: source.originalFileSize.toString(),
		}
	}

	extractPartsFromIdentifier(identifier: string) {
		const searchParams = new URLSearchParams(identifier)
		const [filename, originalUploadSize] = [searchParams.get("filename"), searchParams.get("originalUploadSize")]

		invariant(filename != null, `Unable to extract filename from identifier ${identifier}`)
		invariant(originalUploadSize != null, `Unable to extract originalUploadSize from identifier ${identifier}`)

		return { filename, originalUploadSize }
	}
}

async function downloadGenericFile(downloadLocation: string, sourceUrl: string) {
	const response = await fetch(sourceUrl)

	if (!response.ok) {
		throw new Error(`Unable to download generic file from ${sourceUrl}`)
	}

	invariant(response.body != null, `Unable to download generic file from ${sourceUrl}`)

	const writeStream = fs.createWriteStream(downloadLocation)
	// @ts-ignore
	const readable = stream.Readable.fromWeb(response.body)
	readable.pipe(writeStream)

	return new Promise((resolve, reject) => {
		readable.on("end", resolve)
		readable.on("error", reject)
	})
}
