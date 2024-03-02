import { gql } from "graphql-request"
import { adminMetafieldFragment } from "./admin-metafield-fragment"

export const adminMetafieldByIdentifierMarketQuery = gql`
  ${adminMetafieldFragment}

  query adminMetafieldByIdentifierMarket($ownerId: ID!, $namespace: String!, $key: String!) {
    record: market(id: $ownerId) {
      metafield(namespace: $namespace, key: $key) {
        ...AdminMetafieldFragment
      }
    }
  }
`
