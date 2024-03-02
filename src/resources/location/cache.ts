import { AbstractCache } from "../resource"
import { Location } from "./index"

export class LocationsCache extends AbstractCache<Location> {}

export const locationsCache = new LocationsCache()
