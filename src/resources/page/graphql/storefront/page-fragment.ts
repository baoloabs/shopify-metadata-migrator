import { gql } from "graphql-request"

export const pageFragment = gql`
  fragment PageFragment on Page {
    id
    handle
  }
`
