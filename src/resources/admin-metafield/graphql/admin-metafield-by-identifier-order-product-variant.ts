import { gql } from "graphql-request"
import { adminMetafieldFragment } from "./admin-metafield-fragment"

export const metafieldByIdentifierProductVariantQuery = gql`
  ${adminMetafieldFragment}

  query adminMetafieldByIdentifierProductVariant($ownerId: ID!, $namespace: String!, $key: String!) {
    record: productVariant(id: $ownerId) {
      metafield(namespace: $namespace, key: $key) {
        ...AdminMetafieldFragment
      }
    }
  }
`
