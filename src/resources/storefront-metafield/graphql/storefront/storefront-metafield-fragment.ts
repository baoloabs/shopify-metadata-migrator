import { gql } from "graphql-request"

export const storefrontMetafieldFragment = gql`
  fragment StorefrontMetafieldFragment on Metafield {
    id
    namespace
    key
    parentResource {
      __typename
      
      ... on Article {
        handle
        id
      }
      
      ... on Blog {
        handle
        id
      }
      
      ... on Page {
        handle
        id
      }
    }
    type
    value
  }
`
