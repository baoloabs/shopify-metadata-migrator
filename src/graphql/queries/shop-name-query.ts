import { gql } from "graphql-request"

export const shopNameQuery = gql`
  query shopName {
    shop {
      name
    }
  }
`
