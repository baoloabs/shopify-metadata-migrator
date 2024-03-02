import { gql } from "graphql-request"

export const companyLocationFragment = gql`
  fragment CompanyLocationFragment on CompanyLocation {
    id
    externalId
    company {
      id
    }
  }
`
