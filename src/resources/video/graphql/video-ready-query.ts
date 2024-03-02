import { gql } from "graphql-request"
import { mediaImageFragment } from "../../media-image/graphql/media-image-fragment"
import { videoFragment } from "./video-fragment"

export const videoReadyQuery = gql`
  query fileReady($id: ID!) {
    record: node(id: $id) {
      ... on MediaImage {
        ...MediaImageFragment
      }
      
      ... on Video {
        ...VideoFragment
      }
    }
  }
  
  ${mediaImageFragment}
  ${videoFragment}
`
