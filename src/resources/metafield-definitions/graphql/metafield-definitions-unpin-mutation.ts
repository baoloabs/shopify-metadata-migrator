import { gql } from "graphql-request"

export const metafieldDefinitionsUnpinMutation = gql`
  mutation metafieldDefinitionUnpin($definitionId: ID!) {
    metafieldDefinitionUnpin(definitionId: $definitionId) {
      unpinnedDefinition {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`
