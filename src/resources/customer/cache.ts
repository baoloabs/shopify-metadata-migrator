import { AbstractCache } from "../resource"
import { Customer } from "./index"

export class CustomersCache extends AbstractCache<Customer> {}

export const customersCache = new CustomersCache()
