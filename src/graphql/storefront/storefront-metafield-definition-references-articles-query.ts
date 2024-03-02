import { gql } from "graphql-request"
import { storefrontMetafieldFragment } from "../../resources/storefront-metafield/graphql/storefront/storefront-metafield-fragment"

export const storefrontMetafieldReferencesArticlesQuery = gql`
  query storefrontMetafieldReferencesArticles ($namespace: String!, $key: String!, $first: Int!, $after: String) {
    records: articles (first: $first, after: $after) {
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

  ${storefrontMetafieldFragment}
`
