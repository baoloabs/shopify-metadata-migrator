import fs from "fs"
import { AsyncLocalStorage } from "node:async_hooks"
import path, { dirname } from "path"
import { fileURLToPath } from "url"
import { ENV } from "../env"
import { createGraphQLClient } from "../graphql"
import { createRestClient } from "../rest"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface AppContext {
	tmpDirectory: string

	sourceClient: ReturnType<typeof createGraphQLClient>
	targetClient: ReturnType<typeof createGraphQLClient>

	sourceStorefrontClient: ReturnType<typeof createGraphQLClient>
	targetStorefrontClient: ReturnType<typeof createGraphQLClient>

	sourceRestClient: ReturnType<typeof createRestClient>
	targetRestClient: ReturnType<typeof createRestClient>
}

const asyncLocalStorage = new AsyncLocalStorage<AppContext>()

export function getContext() {
	const context = asyncLocalStorage.getStore()

	if (!context) {
		throw new Error("No context found.")
	}

	return context
}

export function setupContext(): AppContext {
	return {
		tmpDirectory: path.join(getAppRootDir(), "tmp"),

		sourceClient: createGraphQLClient(
			`https://${ENV.SOURCE_API_STORE}.myshopify.com/admin/api/${ENV.API_VERSION}/graphql.json`,
			ENV.SOURCE_API_ACCESS_TOKEN,
			false,
		),
		targetClient: createGraphQLClient(
			`https://${ENV.TARGET_API_STORE}.myshopify.com/admin/api/${ENV.API_VERSION}/graphql.json`,
			ENV.TARGET_API_ACCESS_TOKEN,
			false,
		),

		sourceStorefrontClient: createGraphQLClient(
			`https://${ENV.SOURCE_API_STORE}.myshopify.com/api/${ENV.API_VERSION}/graphql.json`,
			ENV.SOURCE_API_STOREFRONT_TOKEN,
			true,
		),
		targetStorefrontClient: createGraphQLClient(
			`https://${ENV.TARGET_API_STORE}.myshopify.com/api/${ENV.API_VERSION}/graphql.json`,
			ENV.TARGET_API_STOREFRONT_TOKEN,
			true,
		),

		sourceRestClient: createRestClient(
			`https://${ENV.SOURCE_API_STORE}.myshopify.com/admin/api/${ENV.API_VERSION}`,
			ENV.SOURCE_API_ACCESS_TOKEN,
		),
		targetRestClient: createRestClient(
			`https://${ENV.TARGET_API_STORE}.myshopify.com/admin/api/${ENV.API_VERSION}`,
			ENV.TARGET_API_ACCESS_TOKEN,
		),
	}
}

export async function runWithContext<T>(context: AppContext, fn: () => Promise<T>) {
	return await asyncLocalStorage.run(context, async () => {
		return await fn()
	})
}

function getAppRootDir() {
	let currentDir = __dirname

	while (!fs.existsSync(path.join(currentDir, "package.json"))) {
		currentDir = path.join(currentDir, "..")
	}

	return currentDir
}
