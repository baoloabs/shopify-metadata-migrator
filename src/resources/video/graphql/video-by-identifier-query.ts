import { gql } from "graphql-request"
import { videoFragment } from "./video-fragment"

export const videoByIdentifierQuery = gql`
  ${videoFragment}
  
  query videoByIdentifier($query: String!) {
    record: files (query: $query, first: 1) {
      edges {
        node {
          ...VideoFragment
        }
      }
    }
  }
`
