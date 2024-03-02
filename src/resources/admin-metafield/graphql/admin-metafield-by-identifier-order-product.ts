import { gql } from "graphql-request"
import { adminMetafieldFragment } from "./admin-metafield-fragment"

export const metafieldByIdentifierProductQuery = gql`
  ${adminMetafieldFragment}

  query adminMetafieldByIdentifierProduct($ownerId: ID!, $namespace: String!, $key: String!) {
    record: product(id: $ownerId) {
      metafield(namespace: $namespace, key: $key) {
        ...AdminMetafieldFragment
      }
    }
  }
`
