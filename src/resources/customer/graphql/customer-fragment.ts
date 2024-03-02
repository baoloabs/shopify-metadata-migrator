import { gql } from "graphql-request"

export const customerFragment = gql`
  fragment CustomerFragment on Customer {
    id
    email
  }
`
