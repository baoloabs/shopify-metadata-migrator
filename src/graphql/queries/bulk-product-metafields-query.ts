import { gql } from "graphql-request"

export const bulkProductMetafieldsQuery = gql`
  fragment ProductMetafieldFragment on Product {
    __typename
    id
    handle
    metafields {
      edges {
        node {
          __typename
          id
          namespace
          key
          value
          type
        }
      }
    }
  }
  
  query bulkProductMetafieldsQuery {
    products (query: "gift_card:false") {
      edges {
        node {
          ...ProductMetafieldFragment
        }
      }
    }
  }
`
