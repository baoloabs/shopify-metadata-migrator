import { bulkCollectionCreateMutation } from "../../graphql/mutations/bulk-collection-create-mutation"
import { bulkCollectionUpdateMutation } from "../../graphql/mutations/bulk-collection-update-mutation"
import { collectionResource } from "../../resources/collection/utils"
import { BulkCustomCollectionMigrator, BulkSmartCollectionMigrator } from "./bulk-collection-migrator"

export async function migrateCollections() {
	await new BulkSmartCollectionMigrator(
		collectionResource,
		bulkCollectionCreateMutation,
		bulkCollectionUpdateMutation,
		{ forceFresh: true },
	).migrate()

	await new BulkCustomCollectionMigrator(
		collectionResource,
		bulkCollectionCreateMutation,
		bulkCollectionUpdateMutation,
		{ forceFresh: true },
	).migrate()
}
