import invariant from "tiny-invariant"
import {
	CreateMediaInput,
	MediaContentType,
	ProductBulkFragmentFragment,
	ProductInput,
	ProductVariantBulkFragmentFragment,
	ProductVariantInput,
	StagedUploadHttpMethodType,
	StagedUploadTargetGenerateUploadResource,
} from "../../../generated/graphql"
import { getFileNameFromUrl } from "../../utils"
import { ResourceName } from "../../utils/bulk-migrator"
import { log } from "../../utils/log"
import { logger } from "../../utils/logger"
import { StagedUploader } from "../../utils/staged-upload"

type MediaNode = ProductBulkFragmentFragment["media"]["edges"][number]["node"]
type InitialMediaInput = Array<CreateMediaInput & { node: MediaNode }>

class MediaNodeExtractor {
	constructor(private readonly node: MediaNode) {}

	get fileName() {
		switch (this.node.__typename) {
			case "ExternalVideo":
				return getFileNameFromUrl(this.node.originUrl)
			case "Model3d":
				return this.node.filename
			case "MediaImage":
				return getFileNameFromUrl(this.node.image?.url)
			case "Video":
				return this.node.filename
			default:
				throw new Error(`Unknown media type: ${this.node}`)
		}
	}

	get fileSize() {
		switch (this.node.__typename) {
			case "ExternalVideo":
				return ""
			case "Model3d":
				return this.node.originalSource?.filesize?.toString() ?? ""
			case "MediaImage":
				return this.node.originalSource?.fileSize?.toString() ?? ""
			case "Video":
				return this.node.originalSource?.fileSize?.toString() ?? ""
			default:
				throw new Error(`Unknown media type: ${this.node}`)
		}
	}

	get mediaContentType() {
		return this.node.mediaContentType
	}

	get mimeType() {
		switch (this.node.__typename) {
			case "ExternalVideo":
				return null
			case "Model3d":
				return this.node.originalSource?.mimeType
			case "MediaImage":
				return this.node.mimeType
			case "Video":
				return this.node.originalSource?.mimeType
			default:
				throw new Error(`Unknown media type: ${this.node}`)
		}
	}

	get originalSource(): string {
		switch (this.node.__typename) {
			case "ExternalVideo":
				return this.node.originUrl
			case "Model3d":
				return this.node.originalSource?.url || ""
			case "MediaImage":
				return this.node.image?.url
			case "Video":
				return this.node.originalSource?.url || ""
			default:
				throw new Error(`Unknown media type: ${this.node}`)
		}
	}

	get stagedUploadTargetGenerateUploadResource() {
		switch (this.node.__typename) {
			case "ExternalVideo":
				return StagedUploadTargetGenerateUploadResource.File
			case "Model3d":
				return StagedUploadTargetGenerateUploadResource.Model_3D
			case "MediaImage":
				return StagedUploadTargetGenerateUploadResource.File
			case "Video":
				return StagedUploadTargetGenerateUploadResource.Video
			default:
				throw new Error(`Unknown media type: ${this.node}`)
		}
	}
}

class ProductVariantInputCreator {
	static get(
		product: ProductBulkFragmentFragment,
		variant: ProductVariantBulkFragmentFragment,
		createMediaInput: CreateMediaInput[],
	) {
		return new ProductVariantInputCreator(product, variant, createMediaInput).getInput()
	}

	constructor(
		private readonly product: ProductBulkFragmentFragment,
		private readonly variant: ProductVariantBulkFragmentFragment,
		private readonly createMediaInput: CreateMediaInput[],
	) {}

	getInput(): ProductVariantInput {
		return {
			barcode: this.variant.barcode,
			compareAtPrice: this.variant.compareAtPrice,
			harmonizedSystemCode: this.variant.inventoryItem.harmonizedSystemCode,
			inventoryItem: {
				cost: this.variant.inventoryItem.unitCost,
				tracked: this.variant.inventoryItem.tracked,
			},
			inventoryPolicy: this.variant.inventoryPolicy,
			mediaSrc: this.getMediaSrc(),
			options: this.variant.selectedOptions.map(option => option.value),
			position: this.variant.position,
			price: this.variant.price,
			requiresComponents: this.variant.requiresComponents,
			sku: this.variant.sku,
			taxCode: this.variant.taxCode,
			taxable: this.variant.taxable,
			weight: this.variant.weight,
			weightUnit: this.variant.weightUnit,
		}
	}

	getMediaSrc() {
		if (this.createMediaInput.length <= 0) return []
		if (this.variant.media.edges.length <= 0) return []

		const media = this.variant.media.edges.map(({ node }) => node)
		const productMedia = this.product.media.edges.map(({ node }) => new MediaNodeExtractor(node))

		return media
			.map(node => {
				const mediaNodeExtractor = new MediaNodeExtractor(node)
				const productMediaNodeIndex = productMedia.findIndex(node => node.fileName === mediaNodeExtractor.fileName)

				if (productMediaNodeIndex < 0) return ""

				return this.createMediaInput[productMediaNodeIndex].originalSource
			})
			.filter(Boolean)
	}
}

export class ProductInputCreator {
	static async get(source: ProductBulkFragmentFragment) {
		return new ProductInputCreator(source).getInput()
	}

	constructor(private readonly source: ProductBulkFragmentFragment) {}

	async getInput() {
		const mediaInput = await this.getMediaInput()

		const media = await this.getMediaInput()
		const product = this.getBaseProductInput()

		if (this.source.options.length === 1) {
			const option = this.source.options[0]

			if (option.name === "Title" && option.values.length === 1) {
				const variant = this.source.variants.edges[0]?.node
				invariant(variant, "Variant is required")

				return {
					product: {
						...product,
						variants: [ProductVariantInputCreator.get(this.source, variant, [])],
					},
					media,
				}
			}
		}

		const variantsInput = this.source.variants.edges.map(({ node }) =>
			ProductVariantInputCreator.get(this.source, node, mediaInput),
		)

		return {
			product: {
				...product,
				variants: variantsInput,
			},
			media,
		}
	}

	private getBaseProductInput() {
		const productInput: ProductInput = {
			descriptionHtml: this.source.descriptionHtml,
			handle: this.source.handle,
			options: this.source.options.map(option => option.name),
			status: this.source.status,
			tags: this.source.tags,
			templateSuffix: this.source.templateSuffix,
			title: this.source.title,
			vendor: this.source.vendor,
		}

		if (this.source.productCategory?.productTaxonomyNode) {
			productInput.productCategory = {
				productTaxonomyNodeId: this.source.productCategory.productTaxonomyNode.id,
			}
		}

		if (this.source.productType) {
			productInput.productType = this.source.productType
		}

		if (this.source.seo) {
			productInput.seo = {
				description: this.source.seo.description,
				title: this.source.seo.title,
			}
		}

		if (this.source.isGiftCard) {
			productInput.giftCard = true
		}

		return productInput
	}

	private getMediaInput() {
		if (this.source.media.edges.length <= 0) return []

		const initialInput = this.getInitialMediaInput()

		return this.initialMediaInputToCreateMediaInput(initialInput)
	}

	private getInitialMediaInput(): InitialMediaInput {
		return this.source.media.edges.map(({ node }) => {
			const mediaNodeExtractor = new MediaNodeExtractor(node)

			return {
				alt: node.alt,
				mediaContentType: node.mediaContentType,
				originalSource: mediaNodeExtractor.originalSource,
				node,
			}
		})
	}

	private async initialMediaInputToCreateMediaInput(initialMediaInput: InitialMediaInput): Promise<CreateMediaInput[]> {
		const stagedInputs = initialMediaInput
			.filter(input => input.mediaContentType !== MediaContentType.ExternalVideo)
			.map(input => {
				const mediaNodeExtractor = new MediaNodeExtractor(input.node)

				return {
					stagedInput: {
						filename: mediaNodeExtractor.fileName,
						mimeType: mediaNodeExtractor.mimeType as string,
						fileSize: mediaNodeExtractor.fileSize,
						resource: mediaNodeExtractor.stagedUploadTargetGenerateUploadResource,
						httpMethod: StagedUploadHttpMethodType.Post,
					},
					file: mediaNodeExtractor.originalSource,
				}
			})
		const stagedUploader = new StagedUploader(
			global.targetClient,
			stagedInputs.map(input => input.stagedInput),
		)
		const resourceUrls = await stagedUploader.bulkUpload(
			stagedInputs.map(input => new URL(input.file)),
			stagedTarget => {
				return stagedTarget.resourceUrl as string
			},
		)

		return initialMediaInput.map(input => {
			const createInput: CreateMediaInput = {
				alt: input.alt,
				mediaContentType: input.mediaContentType,
				originalSource: input.originalSource,
			}
			const stagedInputIndex = stagedInputs.findIndex(i => i.file === input.originalSource)

			if (stagedInputIndex < 0) {
				return createInput
			}

			createInput.originalSource = resourceUrls[stagedInputIndex]

			return createInput
		})
	}
}

export const productResource: ResourceName = { single: "product", plural: "products" }
