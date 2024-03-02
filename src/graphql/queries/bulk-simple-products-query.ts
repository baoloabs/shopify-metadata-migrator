import { gql } from "graphql-request"
import { SimpleProductIdFragment } from "../fragments/simple-product-id-fragment"

export const bulkSimpleProductsQuery = gql`
  query bulkSimpleProductsQuery {
    products {
      edges {
        node {
          ...SimpleProductIdFragment
        }
      }
    }
  }

  ${SimpleProductIdFragment}
`
