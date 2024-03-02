import { gql } from "graphql-request"

export const blogFragment = gql`
  fragment BlogFragment on Blog {
    id
    handle
  }
`
