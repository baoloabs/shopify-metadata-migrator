import { AbstractCache } from "../resource"
import { CompanyLocation } from "./index"

export class CompanyLocationsCache extends AbstractCache<CompanyLocation> {}

export const companyLocationsCache = new CompanyLocationsCache()
