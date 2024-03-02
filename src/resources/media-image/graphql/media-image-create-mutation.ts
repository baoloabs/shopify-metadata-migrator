import { gql } from "graphql-request"
import { mediaImageFragment } from "./media-image-fragment"

export const mediaImageCreateMutation = gql`
  ${mediaImageFragment}

  mutation mediaImageCreate($input: FileCreateInput!) {
    fileCreate(files: [$input]) {
      files {
        ...MediaImageFragment
      }
      userErrors {
        field
        message
      }
    }
  }
`
