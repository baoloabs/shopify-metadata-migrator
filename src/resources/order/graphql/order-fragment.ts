import { gql } from "graphql-request"

export const orderFragment = gql`
  fragment OrderFragment on Order {
    id
    name
  }
`
