import { AbstractCache } from "../resource"
import { Order } from "./index"

export class OrdersCache extends AbstractCache<Order> {}

export const ordersCache = new OrdersCache()
