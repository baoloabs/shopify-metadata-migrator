import { gql } from "graphql-request"

export const mediaImageFragment = gql`
  fragment MediaImageFragment on MediaImage {
    __typename

    alt
    fileErrors {
      message
      code
      details
    }
    fileStatus
    id
    mimeType
    image {
      width
      height
      url
    }
    mediaContentType
    originalSource {
      fileSize
    }
  }
`
