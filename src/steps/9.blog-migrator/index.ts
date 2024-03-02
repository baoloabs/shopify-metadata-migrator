import { Article } from "@shopify/shopify-api/rest/admin/2023-10/article"
import { Blog } from "@shopify/shopify-api/rest/admin/2023-10/blog"
import { logger } from "../../utils/logger"

export async function migrateBlogsAndArticles() {
	const sourceBlogs = await sourceRestClient.getAll<Blog>("blogs", { searchParams: { limit: "50" } })
	const blogsCount = sourceBlogs.body.length

	let current = 0

	for (const sourceBlog of sourceBlogs.body) {
		current += 1

		logger.info(`${current}/${blogsCount} - Migrating blog ${sourceBlog.title}`)

		const existingBlogs = await targetRestClient.get<{ blogs: Blog[] }>("blogs")
		if (existingBlogs.body.blogs.some(blog => blog.handle === sourceBlog.handle)) {
			logger.info(`Blog "${sourceBlog.title}" already exists in target, skipping`)
			continue
		}

		const targetBlog = await targetRestClient.post<Blog>("blogs", {
			data: {
				blog: {
					title: sourceBlog.title,
					handle: sourceBlog.handle,
					template_suffix: sourceBlog.template_suffix,
				},
			},
		})

		await migrateArticles(sourceBlog, targetBlog.body.blog)
	}
}

async function migrateArticles(sourceBlog: Blog, targetBlog: Blog) {
	const sourceArticles = await sourceRestClient.getAll<Article>(
		`blogs/${sourceBlog.id}/articles`,
		{
			searchParams: { limit: "50" },
		},
		{
			responseKey: "articles",
		},
	)
	const existingArticles = await targetRestClient.getAll<Article>(
		`blogs/${targetBlog.id}/articles`,
		{
			searchParams: { limit: "50" },
		},
		{
			responseKey: "articles",
		},
	)

	const articlesCount = sourceArticles.body.length
	let current = 0

	for (const sourceArticle of sourceArticles.body) {
		current += 1

		logger.info(`${current}/${articlesCount} - Migrating article "${sourceArticle.title}"`)

		if (existingArticles.body.some(article => article.handle === sourceArticle.handle)) {
			logger.info(`Article "${sourceArticle.title}" already exists in target, skipping`)
			continue
		}

		await targetRestClient.post<Article>(`blogs/${targetBlog.id}/articles`, {
			data: {
				article: {
					author: sourceArticle.author,
					body_html: sourceArticle.body_html,
					blog_id: targetBlog.id,
					handle: sourceArticle.handle,
					image: sourceArticle?.image?.src
						? {
								alt: sourceArticle.image?.alt,
								src: sourceArticle.image?.src,
						  }
						: undefined,
					published: sourceArticle.published_at != null,
					summary_html: sourceArticle.summary_html,
					tags: sourceArticle.tags,
					template_suffix: sourceArticle.template_suffix,
					title: sourceArticle.title,
				},
			},
		})
	}
}
