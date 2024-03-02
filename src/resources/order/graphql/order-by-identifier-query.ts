import { gql } from "graphql-request"
import { orderFragment } from "./order-fragment"

export const orderByIdentifierQuery = gql`
  ${orderFragment}

  query orderByIdentifier($query: String!) {
    record: orders(first: 1, query: $query) {
      nodes {
        ...OrderFragment
      }
    }
  }
`
