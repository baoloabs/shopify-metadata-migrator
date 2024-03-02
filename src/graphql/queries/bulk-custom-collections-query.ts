import { gql } from "graphql-request"
import { collectionBulkSimpleFragment } from "../../resources/collection/graphql/collection-bulk-simple-fragment"

export const bulkCustomCollectionsQuery = gql`
  ${collectionBulkSimpleFragment}
  
  query bulkCustomCollectionsQuery {
    collections(query: "collection_type:custom") {
      edges {
        node {
          ...CollectionBulkSimpleFragment     
        }
      }
    }
  }
`
