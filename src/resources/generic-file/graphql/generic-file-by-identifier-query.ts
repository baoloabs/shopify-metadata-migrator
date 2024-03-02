import { gql } from "graphql-request"
import { genericFileFragment } from "./generic-file-fragment"

export const genericFileByIdentifierQuery = gql`
  ${genericFileFragment}
  
  query genericFileByIdentifier($query: String!) {
    record: files (query: $query, first: 1) {
      edges {
        node {
          ...GenericFileFragment
        }
      }
    }
  }
`
