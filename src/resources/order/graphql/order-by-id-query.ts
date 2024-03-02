import { gql } from "graphql-request"
import { orderFragment } from "./order-fragment"

export const orderByIdQuery = gql`
  ${orderFragment}

  query orderById($id: ID!) {
    record: order(id: $id) {
      ...OrderFragment
    }
  }
`
