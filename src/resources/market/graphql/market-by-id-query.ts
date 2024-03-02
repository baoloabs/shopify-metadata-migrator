import { gql } from "graphql-request"
import { marketFragment } from "./market-fragment"

export const marketByIdQuery = gql`
  ${marketFragment}

  query marketById($id: ID!) {
    record: market(id: $id) {
      ...MarketFragment
    }
  }
`
