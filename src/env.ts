import { z } from "zod"

const envVariables = z.object({
	API_VERSION: z.string().default("2023-07"),

	SOURCE_API_STORE: z.string(),
	SOURCE_API_ACCESS_TOKEN: z.string(),
	SOURCE_API_STOREFRONT_TOKEN: z.string(),
	SOURCE_THEME_LOCATION: z.string().optional(),

	TARGET_API_STORE: z.string(),
	TARGET_API_ACCESS_TOKEN: z.string(),
	TARGET_API_STOREFRONT_TOKEN: z.string(),

	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	DEBUG: z.string().optional(),

	LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).optional(),
	LOG_FILENAME: z.string(),
})

export const ENV = envVariables.parse(process.env)

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace NodeJS {
		interface ProcessEnv extends z.infer<typeof envVariables> {}
	}
}
