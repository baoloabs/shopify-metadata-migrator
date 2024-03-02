import { gql } from "graphql-request"
import { customerFragment } from "./customer-fragment"

export const customerByIdentifierQuery = gql`
  ${customerFragment}

  query customerByIdentifier($query: String!) {
    record: customers(first: 1, query: $query) {
      nodes {
        ...CustomerFragment
      }
    }
  }
`
