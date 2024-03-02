import invariant from "tiny-invariant"
import {
	FileContentType,
	FileReadyDocument,
	FileStatus,
	StagedUploadTargetGenerateUploadResource,
	VideoByIdDocument,
	VideoByIdentifierDocument,
	VideoCreateDocument,
	VideoFragmentFragment,
} from "../../../generated/graphql"
import { Client, makeRequest } from "../../graphql"
import { notEmpty } from "../../utils"
import { logger } from "../../utils/logger"
import { StagedUploader } from "../../utils/staged-upload"
import { AbstractBuilder, AbstractIdentifierBuilder, AbstractResource, IdentifierParts } from "../resource"
import { videosCache } from "./cache"

export class Video extends AbstractResource<VideoFragmentFragment> {
	get sourceId() {
		return this.source.id
	}

	get targetId() {
		return this.target.id
	}
}

export class VideoBuilder extends AbstractBuilder<VideoFragmentFragment, Video> {
	async _createOnTargetStore(source: VideoFragmentFragment) {
		if (notEmpty(this.target)) return this.target

		const { filename } = new VideoIdentifierBuilder().extractPartsFromIdentifier(this.getIdentifierFromSource(source))

		invariant(
			source.originalSource?.mimeType != null,
			"Unable to create video on target store because source has no mimeType",
		)
		invariant(
			source.originalSource?.fileSize != null,
			"Unable to create video on target store because source has no fileSize",
		)

		const stagedUploader = new StagedUploader(global.targetClient, {
			filename,
			mimeType: source.originalSource.mimeType,
			resource: StagedUploadTargetGenerateUploadResource.Video,
			fileSize: source.originalSource.fileSize.toString(),
		})
		this.target = await stagedUploader.upload(new URL(source.originalSource?.url), async stagedTarget => {
			const target = await makeRequest(global.targetClient, {
				document: VideoCreateDocument,
				variables: {
					input: {
						alt: source.alt,
						contentType: FileContentType.Video,
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
					"VideoBuilder._createOnTargetStore ",
				)
			}

			const file = target?.fileCreate?.files?.[0]

			invariant(file?.__typename === "Video", "Unable to create video on target store because source has no file")

			if (file.fileStatus !== FileStatus.Ready) {
				return this.getReadyVideo(file.id)
			}

			throw new Error("Unable to create video on target store")
		})

		return this.target
	}

	async _makeByIdentifierRequest(client: Client, identifier: string) {
		const result = await makeRequest(client, {
			document: VideoByIdentifierDocument,
			variables: {
				query: new VideoIdentifierBuilder().toQuery(identifier),
			},
		})

		const node = result?.record?.edges?.[0]?.node

		if (node?.__typename === "Video") {
			return node
		}

		return null
	}

	getIdentifierFromSource(source: VideoFragmentFragment): string {
		return new VideoIdentifierBuilder().buildIdentifierFromParts(source)
	}

	private async getReadyVideo(id: string): Promise<VideoFragmentFragment> {
		const result = await makeRequest(global.targetClient, {
			document: FileReadyDocument,
			variables: {
				id,
			},
		})

		invariant(result?.record?.__typename === "Video", "Unable to get ready video because node is not a video")

		if (result.record.fileStatus !== FileStatus.Ready) {
			return this.getReadyVideo(id)
		}

		return result.record
	}

	get Resource() {
		return Video
	}

	get cache() {
		return videosCache
	}

	get documents() {
		return {
			getByIdentifier: VideoByIdentifierDocument,
			getById: VideoByIdDocument,
			create: VideoCreateDocument,
		}
	}
}

class VideoIdentifierBuilder extends AbstractIdentifierBuilder<VideoFragmentFragment> {
	toQuery(identifier: string) {
		const { filename, originalUploadSize } = this.extractPartsFromIdentifier(identifier)

		return `filename:${filename} AND original_upload_size:${originalUploadSize} AND media_type:VIDEO AND status:ready`
	}

	extractIdentifierFromSource(source: VideoFragmentFragment): IdentifierParts {
		invariant(
			source?.originalSource?.fileSize != null,
			`Unable to extract identifier from video ${source.id} because it has no originalSource`,
		)

		invariant(
			source?.originalSource?.url != null,
			`Unable to extract identifier from video ${source.id} because it has no originalSource`,
		)

		return {
			filename: source.filename,
			originalUploadSize: source.originalSource.fileSize.toString(),
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
