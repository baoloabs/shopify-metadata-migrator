import { gql } from "graphql-request"

export const productsQuery = gql`
  query products ($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          handle
          resourcePublicationOnCurrentPublication {
            publication {
              name
              id
            }
            publishDate
            isPublished
          }
        }
      }
    }
  }
`
