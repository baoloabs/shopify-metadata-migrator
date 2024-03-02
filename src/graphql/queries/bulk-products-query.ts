import { gql } from "graphql-request"
import { productBulkFragment } from "../../resources/product/graphql/product-bulk-fragment"

export const bulkProductsQuery = gql`
  ${productBulkFragment}
  
  query bulkProductsQuery {
    products (query: "gift_card:false") {
      edges {
        node {
          ...ProductBulkFragment     
        }
      }
    }
  }
`
