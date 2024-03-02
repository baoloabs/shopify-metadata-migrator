import { gql } from "graphql-request"
import { storefrontMetafieldFragment } from "../../resources/storefront-metafield/graphql/storefront/storefront-metafield-fragment"

export const storefrontMetafieldReferencesPagesQuery = gql`
  ${storefrontMetafieldFragment}
  
  query storefrontMetafieldReferencesPages ($namespace: String!, $key: String!, $first: Int!, $after: String) {
    records: pages (first: $first, after: $after) {
      nodes {
        handle
        id
        metafield(namespace: $namespace, key: $key) {
          ...StorefrontMetafieldFragment
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`
