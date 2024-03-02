import { Blog } from "@shopify/shopify-api/rest/admin/2023-10/blog"
import { logger } from "./utils/logger"

enum Method {
	Get = "GET",
	Post = "POST",
	Put = "PUT",
	Delete = "DELETE",
}

type FetchApi = (input: string | URL | globalThis.Request, init?: RequestInit) => Promise<Response>

type SearchParamField = string | number
type SearchParamFields =
	| SearchParamField
	| SearchParamField[]
	| { [key: string]: SearchParamField | SearchParamField[] }

export interface SearchParams {
	[key: string]: SearchParamFields
}

interface HeaderOptions {
	[key: string]: string | number | string[]
}

interface GetRequestOptions {
	headers?: HeaderOptions
	data?: { [key: string]: any } | string
	searchParams?: SearchParams
}

interface PostRequestOptions extends GetRequestOptions {
	data: Required<GetRequestOptions>["data"]
}

interface PutRequestOptions extends PostRequestOptions {}

interface DeleteRequestOptions extends GetRequestOptions {}

type RequestOptions = (GetRequestOptions | PostRequestOptions) & {
	method: Method
}

type QueryParams = string | number | string[] | number[] | { [key: string]: QueryParams }

interface PageInfoParams {
	path: string
	query: SearchParams
}

interface PageInfo {
	limit: string
	fields?: string[]
	previousPageUrl?: string
	nextPageUrl?: string
	prevPage?: PageInfoParams
	nextPage?: PageInfoParams
}

interface RequestReturn<T = any> {
	body: T
	headers: Headers
}

type RestRequestReturn<T = unknown> = RequestReturn<T> & {
	pageInfo?: PageInfo
}

export function createRestClient(endpoint: string, accessToken: string) {
	return new RestClient(endpoint, accessToken)
}

class RestClient {
	static LINK_HEADER_REGEXP = /<([^<]+)>; rel="([^"]+)"/
	static DEFAULT_LIMIT = "50"

	fetch: ReturnType<typeof generateFetch>

	constructor(
		private endpoint: string,
		private accessToken: string,
	) {
		this.fetch = generateFetch(generateHttpFetch(fetch))
	}

	public get<T = unknown>(path: string, options: GetRequestOptions = {}): Promise<RestRequestReturn<T>> {
		return this.request<T>(path, {
			...options,
			method: Method.Get,
		})
	}

	public async getAll<T = unknown>(
		path: string,
		options: GetRequestOptions = {},
		{ responseKey }: { responseKey?: string } = {},
	): Promise<RestRequestReturn<T[]>> {
		responseKey = responseKey ?? path

		const makeRequest = async (
			path: string,
			params: SearchParams,
			items: T[] = [],
		): Promise<RestRequestReturn<T[]>> => {
			const response = await this.request<T>(path, {
				...options,
				searchParams: params,
				method: Method.Get,
			})

			// TODO: Almost certainly will break
			// @ts-ignore
			const newItems = response.body[responseKey] as T[]

			if (response.pageInfo?.nextPage) {
				return makeRequest(response.pageInfo.nextPage.path, response.pageInfo.nextPage.query, [...items, ...newItems])
			}

			return {
				body: [...items, ...newItems],
				headers: response.headers,
				pageInfo: response.pageInfo,
			}
		}

		return makeRequest(path, options.searchParams ?? {})
	}

	public post<T = unknown>(path: string, options: PostRequestOptions): Promise<RestRequestReturn<T>> {
		return this.request<T>(path, {
			...options,
			method: Method.Post,
		})
	}

	private async request<T = unknown>(
		path: string,
		{ data, headers, method, searchParams }: RequestOptions,
	): Promise<RestRequestReturn<T>> {
		const normalizedPath = (path.startsWith("/") ? path.slice(1) : path).replace(".json", "")
		const normalizedHeaders = normalizeHeaders(headers ?? {})

		if (normalizedPath.includes("?")) {
			throw new Error("Query parameters should be passed via the `searchParams` option")
		}

		// @ts-ignore
		const url = `${this.endpoint}/${normalizedPath}.json${
			searchParams ? `?${new URLSearchParams(searchParams).toString()}` : ""
		}`
		const requestHeaders = {
			"Content-Type": "application/json",
			...normalizedHeaders,
			Accept: "application/json",
			"X-Shopify-Access-Token": this.accessToken,
		}
		const body = data && typeof data !== "string" ? JSON.stringify(data) : data

		const response = await this.fetch(url, {
			method,
			headers: requestHeaders,
			body,
		})
		const json = await response.json()

		const linkHeader = response.headers.get("link")

		const pageInfo: PageInfo = {
			limit: searchParams?.limit ? searchParams?.limit.toString() : RestClient.DEFAULT_LIMIT,
		}

		if (linkHeader !== "undefined") {
			if (linkHeader) {
				const links = linkHeader.split(", ")

				for (const link of links) {
					const parsedLink = link.match(RestClient.LINK_HEADER_REGEXP)
					if (!parsedLink) {
						continue
					}

					const linkRel = parsedLink[2]
					const linkUrl = new URL(parsedLink[1])
					const linkFields = linkUrl.searchParams.get("fields")
					const linkPageToken = linkUrl.searchParams.get("page_info")

					if (!pageInfo.fields && linkFields) {
						pageInfo.fields = linkFields.split(",")
					}

					if (linkPageToken) {
						switch (linkRel) {
							case "previous":
								pageInfo.previousPageUrl = parsedLink[1]
								pageInfo.prevPage = this.buildRequestParams(parsedLink[1])
								break
							case "next":
								pageInfo.nextPageUrl = parsedLink[1]
								pageInfo.nextPage = this.buildRequestParams(parsedLink[1])
								break
						}
					}
				}
			}
		}

		return {
			body: json as T,
			headers: response.headers,
			pageInfo,
		}
	}

	private buildRequestParams(newPageUrl: string): PageInfoParams {
		const pattern = "^/admin/api/[^/]+/(.*).json$"

		const url = new URL(newPageUrl)
		const path = url.pathname.replace(new RegExp(pattern), "$1")
		return {
			path,
			query: Object.fromEntries(url.searchParams.entries()),
		}
	}
}

const RETRIABLE_STATUS_CODES = [429, 502, 503]

function generateHttpFetch(fetchApi: FetchApi) {
	const httpFetch = async (
		requestParams: Parameters<FetchApi>,
		count: number,
		maxRetries: number,
	): Promise<Response> => {
		const nextCount = count + 1
		const maxTries = maxRetries + 1

		let response: Response | undefined

		try {
			response = await fetchApi(...requestParams)

			logger.info(
				{
					requestParams,
					response,
				},
				"HTTP-Response",
			)

			if (!response.ok && RETRIABLE_STATUS_CODES.includes(response.status) && nextCount <= maxTries) {
				throw new Error()
			}

			return response
		} catch (e: any) {
			if (nextCount <= maxTries) {
				logger.info(
					{
						requestParams,
						lastResponse: response,
						retryAttempt: count,
						maxRetries,
					},
					"HTTP-Retry",
				)

				return httpFetch(requestParams, nextCount, maxRetries)
			}

			throw new Error(
				`HTTP-Retry: Max retries reached (${maxRetries}). ${e instanceof Error ? e.message : JSON.stringify(e)}`,
			)
		}
	}

	return httpFetch
}

function generateFetch(httpFetch: ReturnType<typeof generateHttpFetch>) {
	return async (...args: Parameters<FetchApi>) => {
		return httpFetch([...args], 0, 3)
	}
}

function normalizeHeaders(headersObj: HeaderOptions): {
	[key: string]: string
} {
	const normalizedHeaders: { [key: string]: string } = {}
	for (const [key, value] of Object.entries(headersObj)) {
		normalizedHeaders[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value)
	}
	return normalizedHeaders
}
