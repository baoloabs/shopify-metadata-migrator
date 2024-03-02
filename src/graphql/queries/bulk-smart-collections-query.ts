import { gql } from "graphql-request"
import { collectionFragment } from "../../resources/collection/graphql/collection-fragment"

export const bulkSmartCollectionsQuery = gql`
  ${collectionFragment}
  
  query bulkSmartCollectionsQuery {
    collections(query: "collection_type:smart") {
      edges {
        node {
          ...CollectionFragment     
        }
      }
    }
  }
`
