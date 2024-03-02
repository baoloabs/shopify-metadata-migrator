import { gql } from "graphql-request"
import { storefrontMetafieldFragment } from "./storefront-metafield-fragment"

export const StorefrontMetafieldByIdentifierPageQuery = gql`
  ${storefrontMetafieldFragment}

  query storefrontMetafieldByIdentifierPage($parentId: ID!, $namespace: String!, $key: String!) {
    record: page(id: $parentId) {
      metafield(namespace: $namespace, key: $key) {
        ...StorefrontMetafieldFragment
      }
    }
  }
`
