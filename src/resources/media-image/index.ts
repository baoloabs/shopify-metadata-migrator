import path from "path"
import invariant from "tiny-invariant"
import {
	FileContentType,
	FileCreateInputDuplicateResolutionMode,
	FileReadyDocument,
	FileStatus,
	MediaImageByIdDocument,
	MediaImageByIdentifierDocument,
	MediaImageCreateDocument,
	MediaImageFragmentFragment,
	StagedUploadHttpMethodType,
	StagedUploadTargetGenerateUploadResource,
} from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { getFileNameFromUrl, notEmpty } from "../../utils"
import { logger } from "../../utils/logger"
import { StagedUploader } from "../../utils/staged-upload"
import { AbstractBuilder, AbstractResource } from "../resource"
import { mediaImagesCache } from "./cache"

export class MediaImage extends AbstractResource<MediaImageFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class MediaImageBuilder extends AbstractBuilder<MediaImageFragmentFragment, MediaImage> {
	async _createOnTargetStore(source: MediaImageFragmentFragment) {
		if (notEmpty(this.target)) return this.target

		logger.trace({ source })

		const { filename } = extractMediaImageIdentifierFromSource(source)

		invariant(source.mimeType != null, "Unable to create image on target store because source has no mimeType")
		invariant(
			source?.originalSource?.fileSize != null,
			"Unable to create image on target store because source has no fileSize",
		)
		invariant(source.image?.url != null, "Unable to create image on target store because source has url")

		const stagedUploader = new StagedUploader(global.targetClient, {
			filename,
			mimeType: source.mimeType,
			resource: StagedUploadTargetGenerateUploadResource.File,
			fileSize: source.originalSource.fileSize.toString(),
			httpMethod: StagedUploadHttpMethodType.Post,
		})
		const target = await stagedUploader.upload(new URL(source.image?.url), async stagedTarget => {
			const target = await makeRequest(global.targetClient, {
				document: MediaImageCreateDocument,
				variables: {
					input: {
						alt: source.alt,
						contentType: FileContentType.Image,
						duplicateResolutionMode: FileCreateInputDuplicateResolutionMode.RaiseError,
						filename: filename,
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
					"MediaImageBuilder._createOnTargetStore",
				)
			}

			const file = target?.fileCreate?.files?.[0]

			invariant(file?.__typename === "MediaImage", "Unable to create image on target store because source has no file")

			if (file.fileStatus !== FileStatus.Ready) {
				const record = await this.getReadyImage(file.id)

				if (record.fileStatus === FileStatus.Ready) {
					return record
				}

				if (record.fileStatus === FileStatus.Failed) {
					logger.error({
						file,
						record,
						source,
					})

					throw new Error("Unable to create image on target store because source has no file")
				}
			}

			throw new Error("Unable to create image on target store")
		})

		return target
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const { filename, width, height } = extractMediaImageIdentifier(identifier)
		const filenameWithoutExtension = path.parse(filename).name

		const result = await makeRequest(client, {
			document: MediaImageByIdentifierDocument,
			variables: {
				query: `filename:${filenameWithoutExtension}* AND media_type:IMAGE AND status:ready`,
			},
		})

		const node = result?.record?.nodes?.find(node => {
			if (node?.__typename !== "MediaImage") return false

			return node.image?.width === width && node.image?.height === height
		})

		if (node?.__typename === "MediaImage") {
			return node
		}

		return null
	}

	getIdentifierFromSource(source: MediaImageFragmentFragment): string {
		return getMediaImageIdentifier(extractMediaImageIdentifierFromSource(source))
	}

	private async getReadyImage(id: string): Promise<MediaImageFragmentFragment> {
		const result = await makeRequest(global.targetClient, {
			document: FileReadyDocument,
			variables: {
				id,
			},
		})

		invariant(result?.record?.__typename === "MediaImage", "Unable to get ready video because node is not a image")

		if (result.record.fileStatus === FileStatus.Failed) {
			return result.record
		}

		if (result.record.fileStatus !== FileStatus.Ready) {
			return this.getReadyImage(id)
		}

		return result.record
	}

	get Resource() {
		return MediaImage
	}

	get cache() {
		return mediaImagesCache
	}

	get documents() {
		return {
			getByIdentifier: MediaImageByIdentifierDocument,
			getById: MediaImageByIdDocument,
			create: MediaImageCreateDocument,
		}
	}
}

export function extractMediaImageIdentifierFromSource(source: MediaImageFragmentFragment) {
	if (source?.originalSource?.fileSize == null) {
		throw new Error(`Unable to extract identifier from media image ${source.id} because it has no originalSource`)
	}

	if (source?.image?.url == null) {
		throw new Error(`Unable to extract identifier from media image ${source.id} because it has no image`)
	}

	const filename = getFileNameFromUrl(source.image.url)

	invariant(source.image.width, `Unable to extract identifier from media image ${source.id} because it has no width`)
	invariant(source.image.height, `Unable to extract identifier from media image ${source.id} because it has no height`)

	return {
		filename,
		width: source.image.width,
		height: source.image.height,
	}
}

export function getMediaImageIdentifier({
	filename,
	width,
	height,
}: ReturnType<typeof extractMediaImageIdentifierFromSource>) {
	// We're splitting on an emoji as a delimiter because it's unlikely to be in a filename
	return new URLSearchParams({ filename, width: width.toString(), height: height.toString() }).toString()
}

export function extractMediaImageIdentifier(identifier: string) {
	const searchParams = new URLSearchParams(identifier)
	const filename = searchParams.get("filename")
	const width = searchParams.get("width")
	const height = searchParams.get("height")

	if (filename == null) {
		throw new Error(`Unable to extract filename from identifier ${identifier}`)
	}

	if (width == null) {
		throw new Error(`Unable to extract originalUploadSize from identifier ${identifier}`)
	}

	if (height == null) {
		throw new Error(`Unable to extract originalUploadSize from identifier ${identifier}`)
	}

	return {
		filename,
		width: parseInt(width, 10),
		height: parseInt(height, 10),
	}
}
