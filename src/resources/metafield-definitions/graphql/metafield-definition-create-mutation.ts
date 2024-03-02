import { gql } from "graphql-request"
import { metafieldDefinitionFragment } from "./metafield-definition-fragment"

export const metafieldDefinitionMutations = gql`
  ${metafieldDefinitionFragment}
  
  mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        ...metafieldDefinitionFragment
      }
      userErrors {
        field
        message
      }
    }
  }
`
