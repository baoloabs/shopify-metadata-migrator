import { CodegenConfig } from "@graphql-codegen/cli"

const config: CodegenConfig = {
	generates: {
		"./generated/graphql.ts": {
			schema: "https://shopify.dev/admin-graphql-direct-proxy/2024-01",
			documents: ["src/graphql/{fragments,queries,mutations}/*.{ts,tsx}", "src/resources/**/graphql/*.{ts,tsx}"],
			plugins: ["typescript", "typescript-operations", "typed-document-node"],
			watchPattern: ["src/graphql/{fragments,queries,mutations}/*.{ts,tsx}", "src/resources/**/graphql/*.{ts,tsx}"],
		},
		"./generated/graphql-storefront.ts": {
			schema: {
				"https://bao-agency.myshopify.com/api/2024-01/graphql.json": {
					headers: {
						"X-Shopify-Storefront-Access-Token": "06af9816fe7d8291e3071a1ef5808b60",
					},
				},
			},
			documents: ["src/graphql/storefront/*.{ts,tsx}", "src/resources/**/graphql/storefront/*.{ts,tsx}"],
			plugins: ["typescript", "typescript-operations", "typed-document-node"],
			watchPattern: ["src/graphql/**/storefront/*.{ts,tsx}", "src/resources/**/graphql/storefront/*.{ts,tsx}"],
		},
	},
	hooks: { afterAllFileWrite: ["npx prettier --write"] },
	watch: true,
}

export default config
