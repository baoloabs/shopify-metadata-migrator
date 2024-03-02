import { gql } from "graphql-request"
import { videoFragment } from "./video-fragment"

export const videoByIdQuery = gql`
  ${videoFragment}
  
  query videoById($id: ID!) {
    record: node(id: $id) {
      ...VideoFragment
    }
  }
`
