import dotenv from "dotenv"

dotenv.config()

import path from "path"
import { ENV } from "./env"
import { createGraphQLClient } from "./graphql"
import { createMetaobjectDefinitions } from "./steps/1.metaobject-definitions-creator"
import { createMetafieldDefinitions } from "./steps/2.metafield-definitions-creator"
import { migrateMetaobjects } from "./steps/3.metaobject-creator"
import {} from "./steps/4.metafield-creator"
import { migrateCollections } from "./steps/6.bulk-collection-migrator"
import { migrateProducts } from "./steps/7.bulk-product-migrator"

import { dirname } from "path"
import { fileURLToPath } from "url"
import { createRestClient } from "./rest"
import { ThemeAssetTransferrer } from "./steps/5.theme-asset-transferrer"
import { migratePages } from "./steps/8.page-migrator"
import { migrateBlogsAndArticles } from "./steps/9.blog-migrator"
import { migrateCollectionMetafields } from "./steps/10.collection-metafields-migrator"
import { migrateProductMetafields } from "./steps/11.product-metafields-migrator"
import { publishCollections } from "./steps/12.publish-collections"
import { publishProducts } from "./steps/13.publish-products"
import { updateMetaobjectDefinitions } from "./steps/14.metaobject-definitions-updater"
import { removeUnwantedProducts } from "./steps/15.remove-unwated-products"
import { sleep } from "./utils"
import { runWithContext, setupContext } from "./utils/context"
import { logger } from "./utils/logger"
import { deleteAllMetaobjectDefinitions } from "./utils/metaobject-definition-deleter"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

global.tmpDirectory = path.resolve(__dirname, "../tmp")

global.sourceClient = createGraphQLClient(
	`https://${ENV.SOURCE_API_STORE}.myshopify.com/admin/api/${ENV.API_VERSION}/graphql.json`,
	ENV.SOURCE_API_ACCESS_TOKEN,
	false,
)
global.targetClient = createGraphQLClient(
	`https://${ENV.TARGET_API_STORE}.myshopify.com/admin/api/${ENV.API_VERSION}/graphql.json`,
	ENV.TARGET_API_ACCESS_TOKEN,
	false,
)
global.sourceStorefrontClient = createGraphQLClient(
	`https://${ENV.SOURCE_API_STORE}.myshopify.com/api/${ENV.API_VERSION}/graphql.json`,
	ENV.SOURCE_API_STOREFRONT_TOKEN,
	true,
)
global.targetStorefrontClient = createGraphQLClient(
	`https://${ENV.TARGET_API_STORE}.myshopify.com/api/${ENV.API_VERSION}/graphql.json`,
	ENV.TARGET_API_STOREFRONT_TOKEN,
	true,
)

global.sourceRestClient = createRestClient(
	`https://${ENV.SOURCE_API_STORE}.myshopify.com/admin/api/${ENV.API_VERSION}`,
	ENV.SOURCE_API_ACCESS_TOKEN,
)

global.targetRestClient = createRestClient(
	`https://${ENV.TARGET_API_STORE}.myshopify.com/admin/api/${ENV.API_VERSION}`,
	ENV.TARGET_API_ACCESS_TOKEN,
)
;(async () => {
	const context = setupContext()

	return await runWithContext(context, async () => {
		logger.info(`Starting migration from ${ENV.SOURCE_API_STORE} to ${ENV.TARGET_API_STORE}`)

		await sleep(5000)

		// await createMetaobjectDefinitions()
		// await createMetafieldDefinitions()
		//
		// await migrateProducts()
		// await migrateCollections()
		//
		// await migratePages()
		// await migrateBlogsAndArticles()
		//
		// await migrateMetaobjects()
		//
		// await migrateCollectionMetafields()
		// await migrateProductMetafields()
		//
		// await publishCollections()
		// await publishProducts()
		//
		// await migrateMetaobjects()
		//
		// await updateMetaobjectDefinitions()
		// TODO: Clean up unwanted products (PRODUCT_TYPES_TO_IGNORE)
		await removeUnwantedProducts()

		// if (ENV.SOURCE_THEME_LOCATION) {
		//   await ThemeAssetTransferrer.run()
		// }

		process.exit(0)
	})
})()
