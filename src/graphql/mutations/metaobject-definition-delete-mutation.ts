import { gql } from "graphql-request"

export const metaobjectDefinitionDeleteMutation = gql`
  mutation metaobjectDefinitionDelete($id: ID!) {
    metaobjectDefinitionDelete(id: $id) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`
