import { gql } from "graphql-request"
import { genericFileFragment } from "../../resources/generic-file/graphql/generic-file-fragment"
import { mediaImageFragment } from "../../resources/media-image/graphql/media-image-fragment"
import { videoFragment } from "../../resources/video/graphql/video-fragment"

export const filesQuery = gql`
  ${genericFileFragment}
  ${mediaImageFragment}
  ${videoFragment}

  query files ($first: Int!, $after: String, $query: String) {
    files (first: $first, after: $after, query: $query) {
      nodes {
        ... on GenericFile {
          ...GenericFileFragment
        }

        ... on MediaImage {
          ...MediaImageFragment
        }
        
        ... on Video {
          ...VideoFragment
        }
      }
    }
  }
`
