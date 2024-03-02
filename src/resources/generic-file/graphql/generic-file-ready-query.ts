import { gql } from "graphql-request"
import { genericFileFragment } from "./generic-file-fragment"

export const genericFileReadyQuery = gql`
  ${genericFileFragment}
  
  query genericFileReady($id: ID!) {
    record: node(id: $id) {
      ...GenericFileFragment
    }
  }
`
