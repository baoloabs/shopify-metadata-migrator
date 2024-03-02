import { gql } from "graphql-request"
import { storefrontMetafieldFragment } from "../../resources/storefront-metafield/graphql/storefront/storefront-metafield-fragment"

export const storefrontMetafieldReferencesBlogsQuery = gql`
  ${storefrontMetafieldFragment}
  
  query storefrontMetafieldReferencesBlogs ($namespace: String!, $key: String!, $first: Int!, $after: String) {
    records: blogs (first: $first, after: $after) {
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
