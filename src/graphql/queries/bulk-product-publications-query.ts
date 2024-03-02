import { gql } from "graphql-request"

export const bulkProductPublicationsQuery = gql`
  fragment ProductPublicationFragment on Product {
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
  
  query bulkProductPublicationsQuery {
    products (query: "gift_card:false") {
      edges {
        node {
          ...ProductPublicationFragment
        }
      }
    }
  }
`
