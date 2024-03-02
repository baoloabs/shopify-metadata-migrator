import { gql } from "graphql-request"

export const metafieldDefinitionsPinMutation = gql`
  mutation metafieldDefinitionPin($definitionId: ID!) {
    metafieldDefinitionPin(definitionId: $definitionId) {
      pinnedDefinition {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`
