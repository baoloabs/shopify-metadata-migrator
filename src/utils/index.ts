import fs from "fs"
import { Readable } from "node:stream"
import { finished } from "node:stream/promises"
import path from "path"
import invariant from "tiny-invariant"
import { logger } from "./logger"

export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
	return value !== null && value !== undefined
}

export function empty<TValue>(value: TValue | null | undefined): value is TValue {
	if (value == null) {
		return false
	}

	if (typeof value === "undefined") {
		return false
	}

	return true
}

export class FileDownloader {
	static async download(url: URL | string, fileName: string, downloadLocation?: string) {
		if (typeof url === "string") {
			url = new URL(url)
		}

		return new FileDownloader(url, fileName, downloadLocation).download()
	}

	constructor(
		private readonly url: URL,
		private readonly fileName: string,
		private readonly downloadLocation?: string,
	) {}

	async download() {
		logger.info({ url: this.url.toString(), location: this.fileLocation }, "Downloading file")
		await this.downloadAsset()

		return new Resource(fs.readFileSync(this.fileLocation), this.fileLocation)
	}

	private async downloadAsset() {
		const response = await fetch(this.url.toString())

		if (!response.ok) {
			throw new Error(`Unable to download asset from ${this.url.toString()}`)
		}

		invariant(response.body != null, `Unable to download asset from ${this.url.toString()}`)

		// @ts-ignore
		const readable = Readable.fromWeb(response.body)
		const writeStream = fs.createWriteStream(this.fileLocation)

		await finished(readable.pipe(writeStream))

		return Promise.resolve()
	}

	get fileLocation() {
		return this.downloadLocation ?? path.join(global.tmpDirectory, this.fileName)
	}
}

export function getFileNameFromUrl(url: URL | string) {
	if (typeof url === "string") {
		url = new URL(url)
	}

	const pathnameParts = url.pathname.split("/")

	return pathnameParts[pathnameParts.length - 1]
}

export class Resource {
	constructor(
		public readonly file: Buffer,
		public readonly location: string,
	) {}

	static from(path: string): Resource {
		return new Resource(fs.readFileSync(path), path)
	}

	remove() {
		fs.unlinkSync(this.location)
	}

	get filename() {
		return path.basename(this.location)
	}
}

export async function sleep(waitTime: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, waitTime))
}

export function cyrb53(str: string, seed = 0) {
	let h1 = 0xdeadbeef ^ seed
	let h2 = 0x41c6ce57 ^ seed
	for (let i = 0, ch: number; i < str.length; i++) {
		ch = str.charCodeAt(i)
		h1 = Math.imul(h1 ^ ch, 2654435761)
		h2 = Math.imul(h2 ^ ch, 1597334677)
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)

	return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

export function deeplyStripKeys<T extends Record<string, any>>(obj: T, keys: string[]) {
	const newObj = { ...obj }

	for (const newObjKey in newObj) {
		if (keys.includes(newObjKey)) {
			delete newObj[newObjKey]
		}

		if (typeof newObj[newObjKey] === "object") {
			newObj[newObjKey] = deeplyStripKeys(newObj[newObjKey], keys)
		}
	}

	return newObj
}
