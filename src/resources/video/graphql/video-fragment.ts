import { gql } from "graphql-request"

export const videoFragment = gql`
  fragment VideoFragment on Video {
    __typename
    
    alt
    fileStatus
    fileErrors {
      message
      code
      details
    }
    id
    mediaContentType
    filename
    originalSource {
      fileSize
      mimeType
      url
    }
    sources {
      fileSize
      url
    }
  }
`
