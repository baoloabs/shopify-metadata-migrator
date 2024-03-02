import { gql } from "graphql-request"
import { mediaImageFragment } from "./media-image-fragment"

export const mediaImageByIdQuery = gql`
  ${mediaImageFragment}

  query mediaImageById($id: ID!) {
    record: node(id: $id) {
      ...MediaImageFragment
    }
  }
`
