import { gql } from "graphql-request"
import { adminMetafieldFragment } from "../../resources/admin-metafield/graphql/admin-metafield-fragment"

export const adminMetafieldDefinitionReferencesQuery = gql`
  ${adminMetafieldFragment}
  
  query adminMetafieldDefinitionReferences ($id: ID!, $first: Int!, $after: String) {
    metafieldDefinition(id: $id) {
      name
      id
      metafields(first: $first, after: $after) {
        nodes {
          ...AdminMetafieldFragment
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`
