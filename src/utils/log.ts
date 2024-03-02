import util from "node:util"

export function log(thing: any) {
	console.log(util.inspect(thing, false, null, true /* enable colors */))
}
