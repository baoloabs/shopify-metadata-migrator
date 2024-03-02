import { gql } from "graphql-request"
import { videoFragment } from "./video-fragment"

export const videoCreateMutation = gql`
  ${videoFragment}
  
  mutation videoCreate($input: FileCreateInput!) {
    fileCreate(files: [$input]) {
      files {
        ...VideoFragment
      }
      userErrors {
        field
        message
      }
    }
  }
`
