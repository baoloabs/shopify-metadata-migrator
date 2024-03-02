import { gql } from "graphql-request"
import { adminMetafieldFragment } from "./admin-metafield-fragment"

export const adminMetafieldByIdentifierLocationQuery = gql`
  ${adminMetafieldFragment}

  query adminMetafieldByIdentifierLocation($ownerId: ID!, $namespace: String!, $key: String!) {
    record: location(id: $ownerId) {
      metafield(namespace: $namespace, key: $key) {
        ...AdminMetafieldFragment
      }
    }
  }
`
