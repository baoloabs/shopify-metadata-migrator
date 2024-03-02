import { AbstractCache } from "../resource"
import { Company } from "./index"

export class CompaniesCache extends AbstractCache<Company> {}

export const companiesCache = new CompaniesCache()
