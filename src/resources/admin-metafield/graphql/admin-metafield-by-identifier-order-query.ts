import { gql } from "graphql-request"
import { adminMetafieldFragment } from "./admin-metafield-fragment"

export const adminMetafieldByIdentifierOrderQuery = gql`
  ${adminMetafieldFragment}

  query adminMetafieldByIdentifierOrder($ownerId: ID!, $namespace: String!, $key: String!) {
    record: order(id: $ownerId) {
      metafield(namespace: $namespace, key: $key) {
        ...AdminMetafieldFragment
      }
    }
  }
`
