import { gql } from "graphql-request"
import { mediaImageFragment } from "./media-image-fragment"

export const mediaImageByIdentifierQuery = gql`
  ${mediaImageFragment}

  query mediaImageByIdentifier($query: String!) {
    record: files (query: $query, first: 50) {
      nodes {
        ...MediaImageFragment
      }
    }
  }
`
