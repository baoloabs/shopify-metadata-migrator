import { gql } from "graphql-request"
import { storefrontMetafieldFragment } from "./storefront-metafield-fragment"

export const storefrontMetafieldByIdentifierArticleQuery = gql`
  ${storefrontMetafieldFragment}

  query storefrontMetafieldByIdentifierArticle($parentId: ID!, $namespace: String!, $key: String!) {
    record: article(id: $parentId) {
      metafield(namespace: $namespace, key: $key) {
        ...StorefrontMetafieldFragment
      }
    }
  }
`
