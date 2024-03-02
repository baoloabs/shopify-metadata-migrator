import { gql } from "graphql-request"
import { storefrontMetafieldFragment } from "./storefront-metafield-fragment"

export const storefrontMetafieldByIdentifierBlogQuery = gql`
  ${storefrontMetafieldFragment}

  query storefrontMetafieldByIdentifierBlog($parentId: ID!, $namespace: String!, $key: String!) {
    record: blog(id: $parentId) {
      metafield(namespace: $namespace, key: $key) {
        ...StorefrontMetafieldFragment
      }
    }
  }
`
