import { gql } from "graphql-request"
import { companyFragment } from "./company-fragment"

export const companyByIdentifierQuery = gql`
  ${companyFragment}

  query companyByIdentifier($query: String!) {
    record: companies(first: 1, query: $query) {
      nodes {
        ...CompanyFragment
      }
    }
  }
`
