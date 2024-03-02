import { gql } from "graphql-request"

export const bulkCollectionMetafieldsQuery = gql`
  fragment CollectionMetafieldFragment on Collection {
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
  
  query bulkCollectionMetafieldsQuery {
    collections {
      edges {
        node {
          ...CollectionMetafieldFragment
        }
      }
    }
  }
`
