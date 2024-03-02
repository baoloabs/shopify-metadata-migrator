import pino from "pino"

import { ENV } from "../env"

const transport = pino.transport({
	dedupe: true,
	targets: [
		{
			target: "pino-pretty",
			options: {
				colorize: true,
			},
		},
		// {
		//   target: 'pino/file',
		//   level: 'trace',
		//   options: {
		//     destination: `logs/${ENV.LOG_FILENAME}.trace.log`,
		//     append: false,
		//     mkdir: true,
		//   },
		// },
		// {
		//   target: 'pino/file',
		//   level: 'debug',
		//   options: {
		//     destination: `logs/${ENV.LOG_FILENAME}.debug.log`,
		//     append: false,
		//     mkdir: true,
		//   },
		// },
		// {
		//   target: 'pino/file',
		//   level: 'info',
		//   options: {
		//     destination: `logs/${ENV.LOG_FILENAME}.info.log`,
		//     append: false,
		//     mkdir: true,
		//   },
		// },
		// {
		//   target: 'pino/file',
		//   level: 'error',
		//   options: {
		//     destination: `logs/${ENV.LOG_FILENAME}.error.log`,
		//     append: false,
		//     mkdir: true,
		//   },
		// },
		{
			target: "pino/file",
			options: {
				destination: `logs/${ENV.LOG_FILENAME}.log`,
				append: false,
				mkdir: true,
			},
		},
	],
})

export const logger = pino(
	{
		level: "trace",
	},
	transport,
)
