import { gql } from "graphql-request"
import { metafieldDefinitionFragment } from "./metafield-definition-fragment"

export const metafieldDefinitionByIdQuery = gql`
  ${metafieldDefinitionFragment}

  query metafieldDefinitionById($id: ID!) {
    record: metafieldDefinition(id: $id) {
      ...metafieldDefinitionFragment
    }
  }
`
