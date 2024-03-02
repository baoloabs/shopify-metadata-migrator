import { gql } from "graphql-request"

export const companyFragment = gql`
  fragment CompanyFragment on Company {
    id
    name
  }
`
