import { CodegenConfig } from "@graphql-codegen/cli"
import codegenLocal from "./codegen-local"

const config: CodegenConfig = Object.assign({}, codegenLocal, {
	generates: {
		...codegenLocal.generates,
		"./shopify-admin-api.graphql": {
			schema: "https://shopify.dev/admin-graphql-direct-proxy/2024-01",
			documents: ["src/graphql/{fragments,queries,mutations}/*.{ts,tsx}", "src/resources/**/graphql/*.{ts,tsx}"],
			plugins: ["schema-ast"],
			config: {
				watch: false,
			},
		},
		"./shopify-storefront-api.graphql": {
			schema: {
				"https://bao-agency.myshopify.com/api/2024-01/graphql.json": {
					headers: {
						"X-Shopify-Storefront-Access-Token": "06af9816fe7d8291e3071a1ef5808b60",
					},
				},
			},
			documents: ["src/graphql/**/storefront/*.{ts,tsx}", "src/resources/**/graphql/storefront/*.{ts,tsx}"],
			plugins: ["schema-ast"],
			config: {
				watch: false,
			},
		},
	},
})
export default config
