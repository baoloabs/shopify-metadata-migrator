import { gql } from "graphql-request"
import { genericFileFragment } from "./generic-file-fragment"

export const genericFileByIdQuery = gql`
  ${genericFileFragment}
  
  query genericFileById($id: ID!) {
    record: node(id: $id) {
      ...GenericFileFragment
    }
  }
`
