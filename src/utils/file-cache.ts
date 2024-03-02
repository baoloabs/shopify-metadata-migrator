import fs from "fs"
import path from "path"
import { Resource } from "./index"
import { logger } from "./logger"

class FileCache {
	TTL = 1000 * 60 * 60 // 1 hour

	public get(key: string, customTTL?: number): Resource | null {
		const TTL = customTTL || this.TTL
		const files = fs.readdirSync(global.tmpDirectory)

		for (const file of files) {
			const filename = path.join(global.tmpDirectory, file)
			const stat = fs.lstatSync(filename)

			if (stat.isFile() && file.startsWith(key)) {
				const now = new Date().getTime()
				const mtime = stat.mtime.getTime()
				const diff = now - mtime

				if (diff < TTL) {
					return Resource.from(filename)
				}
			}
		}

		return null
	}

	public set(key: string, content: string): void {
		logger.info(`Caching ${key}...`)

		fs.writeFileSync(path.join(global.tmpDirectory, key), content)
	}

	public has(key: string): boolean {
		return this.get(key) !== null
	}
}

export const fileCache = new FileCache()
