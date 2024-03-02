import { gql } from "graphql-request"

export const bulkCollectionPublicationsQuery = gql`
  fragment CollectionPublicationFragment on Collection {
    __typename
    id
    handle
    resourcePublicationsV2 (first: 50, onlyPublished: false) {
      edges {
        node {
          __typename
          isPublished
          publishDate
          publication {
            __typename
            id
            name
          }
        }
      }
    }
  }
  
  query bulkCollectionPublicationsQuery {
    collections {
      edges {
        node {
          ...CollectionPublicationFragment
        }
      }
    }
  }
`
