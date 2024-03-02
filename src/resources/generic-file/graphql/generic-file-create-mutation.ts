import { gql } from "graphql-request"
import { genericFileFragment } from "./generic-file-fragment"

export const genericFileCreateMutation = gql`
  ${genericFileFragment}
  
  mutation genericFileCreate($input: FileCreateInput!) {
    fileCreate(files: [$input]) {
      files {
        ...GenericFileFragment
      }
      userErrors {
        field
        message
      }
    }
  }
`
