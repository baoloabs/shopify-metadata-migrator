import { Page } from "@shopify/shopify-api/rest/admin/2023-10/page"
import { logger } from "../../utils/logger"

export async function migratePages() {
	const sourcePages = await sourceRestClient.getAll<Page>("pages", { searchParams: { limit: "50" } })
	const existingPages = await targetRestClient.getAll<Page>("pages", { searchParams: { limit: "50" } })
	const pagesCount = sourcePages.body.length

	let current = 0

	for (const sourcePage of sourcePages.body) {
		current += 1

		logger.info(`${current}/${pagesCount} - Migrating page ${sourcePage.title}`)

		if (existingPages.body.some(page => page.handle === sourcePage.handle)) {
			logger.info(`Page "${sourcePage.title}" already exists in target, skipping`)
			continue
		}

		const res = await targetRestClient.post("pages", {
			data: {
				page: {
					author: sourcePage.author,
					body_html: sourcePage.body_html,
					handle: sourcePage.handle,
					template_suffix: sourcePage.template_suffix,
					title: sourcePage.title,
				},
			},
		})

		logger.info({ res })
	}
}
