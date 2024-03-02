import { gql } from "graphql-request"

export const mediaFragment = gql`
  fragment MediaFragment on Media {
    __typename

    id
    alt
    mediaContentType

    ... on ExternalVideo {
      originUrl
    }

    ... on Model3d {
      filename
      originalSource {
        filesize
        mimeType
        url
      }
    }

    ... on MediaImage {
      image {
        url
      }
      mimeType
      originalSource {
        fileSize
      }
    }

    ... on Video {
      filename
      originalSource {
        fileSize
        mimeType
        url
      }
    }
  }
`
