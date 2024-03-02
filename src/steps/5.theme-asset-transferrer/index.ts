import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { FilesDocument } from "../../../generated/graphql"
import { ENV } from "../../env"
import { makeRequest } from "../../graphql"
import { resourceFactory } from "../../resources/factory"
import { MediaImage } from "../../resources/media-image"
import { Video } from "../../resources/video"
import { Resources } from "../../types"
import { log } from "../../utils/log"

const FOLDERS_THAT_CONTAIN_JSON = ["sections", "templates"]

export class ThemeAssetTransferrer {
	static async run() {
		const transferrer = new ThemeAssetTransferrer()

		return transferrer.run()
	}

	async run() {
		const fileNames = await this.getFileNames()
		const resources: Record<string, Resources> = {}

		for (const fileName of fileNames) {
			if (typeof fileName !== "string") continue

			const files = await makeRequest(global.sourceClient, {
				document: FilesDocument,
				variables: {
					first: 1,
					query: `filename:${fileName}`,
				},
			})
			// gid://shopify/MediaImage/35484901343549'
			const file = files.files?.nodes?.[0]

			if (!file) {
				console.error(`Unable to find file ${fileName}`)
			}

			const id = file.id
			const resource = await resourceFactory(id)

			resources[fileName] = resource
		}
	}

	async getFileNames() {
		const relevantFiles = await this.getRelevantJsonFiles()
		const fileNames = relevantFiles.flatMap(file => {
			const data = fs.readFileSync(file, "utf8")
			const json = JSON.parse(data)

			return this.getAssetsFromFile(json)
		})

		const uniqueFileNames = [...new Set(fileNames)]

		return uniqueFileNames.map(fileName => fileName.split("/").pop())
	}

	async getRelevantJsonFiles() {
		const settingsData = path.join(this.sourceDirectory, "config", "settings_data.json")
		const jsonFiles = FOLDERS_THAT_CONTAIN_JSON.flatMap(folder => {
			const location = path.join(this.sourceDirectory, folder)
			const files = fs.readdirSync(location)

			return files.filter(file => file.endsWith(".json")).map(file => path.join(location, file))
		})

		return [settingsData, ...jsonFiles].filter(file => {
			const data = fs.readFileSync(file, "utf8")
			const json = JSON.parse(data)

			return this.checkIfFileIsRelevant(json)
		})
	}

	checkIfFileIsRelevant(file: Record<string, any>): boolean {
		if (Object.keys(file).length === 0) return false

		for (const value of Object.values(file)) {
			if (typeof value === "string" && (value.includes("shopify://shop_images/") || value.includes("shopify://files/")))
				return true
			if (typeof value === "object") return this.checkIfFileIsRelevant(value)
		}

		return false
	}

	getAssetsFromFile(file: Record<string, any>, values: string[] = []): string[] {
		if (Object.keys(file).length === 0) return values

		for (const value of Object.values(file)) {
			if (typeof value === "string" && (value.includes("shopify://shop_images/") || value.includes("shopify://files/")))
				values.push(value)
			if (typeof value === "object") this.getAssetsFromFile(value, values)
		}

		return values
	}

	get sourceDirectory() {
		if (!ENV.SOURCE_THEME_LOCATION) {
			throw new Error("env.SOURCE_THEME_LOCATION is not defined")
		}

		return path.join(ENV.SOURCE_THEME_LOCATION.replace(/^~/, os.homedir()))
	}
}
