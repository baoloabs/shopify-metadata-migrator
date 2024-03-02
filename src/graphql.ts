import { ClientError, Variables } from "graphql-request"
import { GraphQLClient } from "graphql-request"
import { sleep } from "./utils"
import { logger } from "./utils/logger"
import { RateLimiter } from "./utils/rate-limiter"

global.apiLimits = {}

const RETRIABLE_STATUS_CODES = [429, 502, 503]

export function createGraphQLClient(endpoint: string, accessToken: string, storefront = false) {
	global.apiLimits[endpoint] = {
		maximumAvailable: 10_000,
		currentlyAvailable: 10_000,
		restoreRate: 500,
	}

	const rateLimiter = new RateLimiter(1_000, 50)

	const client = new GraphQLClient(endpoint, {
		errorPolicy: "none",
		headers: {
			[storefront ? "X-Shopify-Storefront-Access-Token" : "X-Shopify-Access-Token"]: accessToken,
			"X-GraphQL-Cost-Include-Fields": "true",
		},
		responseMiddleware: async response => {
			if (response instanceof Error) {
				return
			}

			const extensions = (response?.extensions ?? {}) as MiddlewareResponse["extensions"]

			if (Object.keys(extensions).length === 0) {
				return
			}

			// rateLimiter.updateTokens(
			//   extensions.cost.throttleStatus.currentlyAvailable,
			//   extensions.cost.actualQueryCost,
			// )

			global.apiLimits[endpoint] = {
				maximumAvailable: extensions.cost.throttleStatus.maximumAvailable,
				currentlyAvailable: extensions.cost.throttleStatus.currentlyAvailable,
				restoreRate: extensions.cost.throttleStatus.restoreRate,
			}

			logger.trace(
				{
					Requested: `${extensions.cost.requestedQueryCost}/${extensions.cost.throttleStatus.maximumAvailable}`,
					Actual: `${extensions.cost.actualQueryCost}/${extensions.cost.throttleStatus.maximumAvailable}`,
					ThrottleStatus: {
						MaximumAvailable: extensions.cost.throttleStatus.maximumAvailable,
						CurrentlyAvailable: extensions.cost.throttleStatus.currentlyAvailable,
						RestoreRate: extensions.cost.throttleStatus.restoreRate,
					},
				},
				"GraphQL Cost:",
			)
		},
	})

	return {
		graphql: client,
		apiLimits: global.apiLimits[endpoint],
		endpoint,
	}
}

interface MiddlewareResponse {
	extensions: {
		cost: {
			requestedQueryCost: number
			actualQueryCost: number
			throttleStatus: {
				maximumAvailable: number
				currentlyAvailable: number
				restoreRate: number
			}
		}
	}
}

export type Client = ReturnType<typeof createGraphQLClient>

export async function makeRequest<T, V extends Variables>(
	client: Client,
	...args: Parameters<typeof client.graphql.request<T, V>>
) {
	async function request(
		{ count, maxRetries } = { count: 0, maxRetries: 3 },
	): ReturnType<typeof client.graphql.request<T, V>> {
		const nextCount = count + 1
		const maxTries = maxRetries + 1

		try {
			return await client.graphql.request<T, V>(...args)
		} catch (e: any) {
			if (e instanceof ClientError) {
				logger.info("ClientError", e.response.errors)
				if (nextCount <= maxTries && RETRIABLE_STATUS_CODES.includes(e.response.status)) {
					await sleep(1000 * nextCount)

					logger.info(
						{
							error: e,
							count: nextCount,
							maxRetries,
						},
						"Retrying request",
					)

					return request({ count: nextCount, maxRetries })
				}
			}

			throw e
		}
	}

	return request()
}
