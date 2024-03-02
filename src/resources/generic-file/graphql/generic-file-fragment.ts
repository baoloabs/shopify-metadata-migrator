import { gql } from "graphql-request"

export const genericFileFragment = gql`
  fragment GenericFileFragment on GenericFile {
    __typename
    
    alt
    fileStatus
    id
    mimeType
    originalFileSize
    url
  }
`
