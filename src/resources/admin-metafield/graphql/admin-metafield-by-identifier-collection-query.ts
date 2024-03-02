import { gql } from "graphql-request"
import { adminMetafieldFragment } from "./admin-metafield-fragment"

export const adminMetafieldByIdentifierCollectionQuery = gql`
  ${adminMetafieldFragment}

  query adminMetafieldByIdentifierCollection($ownerId: ID!, $namespace: String!, $key: String!) {
    record: collection(id: $ownerId) {
      metafield(namespace: $namespace, key: $key) {
        ...AdminMetafieldFragment
      }
    }
  }
`
