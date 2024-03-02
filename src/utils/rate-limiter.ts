import { makeRequest } from "../graphql"

// TODO: https://chat.openai.com/share/2d40186b-27dd-4407-b4f1-44d8a7a2dfce
export class RateLimiter {
	private readonly bucketSize: number
	private readonly replenishRate: number
	private readonly historySize: number

	private tokens: number
	private queue: (() => Promise<void>)[]
	private recentCosts: number[]
	private averageCost: number

	constructor(bucketSize: number, replenishRate: number, historySize = 10) {
		this.bucketSize = bucketSize
		this.tokens = bucketSize
		this.replenishRate = replenishRate
		this.queue = []
		this.recentCosts = []
		this.averageCost = bucketSize // Initially assume the worst case
		this.historySize = historySize

		setInterval(() => this.replenishTokens(), 1000)
	}

	private replenishTokens(): void {
		this.tokens = Math.min(this.tokens + this.replenishRate, this.bucketSize)

		this.processQueue()
	}

	private updateAverageCost(newCost: number): void {
		this.recentCosts.push(newCost)

		if (this.recentCosts.length > this.historySize) {
			this.recentCosts.shift()
		}

		this.averageCost = this.recentCosts.reduce((a, b) => a + b, 0) / this.recentCosts.length
	}

	private async processQueue(): Promise<void> {
		while (this.queue.length > 0 && this.tokens >= this.averageCost) {
			const limitedRequest = this.queue.shift()

			if (limitedRequest) {
				await limitedRequest()
			}
		}
	}

	public async limitRequest(
		request: (...args: Parameters<typeof makeRequest>) => ReturnType<typeof makeRequest>,
	): ReturnType<typeof makeRequest> {
		if (this.tokens >= this.averageCost) {
			this.tokens -= this.averageCost // Deduct estimated cost
			// @ts-ignore
			const response = await request(...args)

			// The cost is updated by the graphql client middleware

			this.processQueue()

			return response
		}
		return new Promise(resolve => {
			this.queue.push(async () => {
				const result = await this.limitRequest(request)
				resolve(result)
			})
		})
	}

	public updateTokens(tokens: number, cost: number): void {
		this.tokens = tokens
		this.updateAverageCost(cost)
	}
}
