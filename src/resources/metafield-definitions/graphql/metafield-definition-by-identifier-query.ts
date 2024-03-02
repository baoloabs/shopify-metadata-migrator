import { gql } from "graphql-request"
import { metafieldDefinitionFragment } from "./metafield-definition-fragment"

export const metafieldDefinitionByIdentifierQuery = gql`
  ${metafieldDefinitionFragment}
  
  query metafieldDefinitionByIdentifier ($query: String!, $ownerType: MetafieldOwnerType!) {
    record: metafieldDefinitions(first: 1, query: $query, ownerType: $ownerType) {
      edges {
        node {
          ...metafieldDefinitionFragment
        }
      }
    }
  }
`
