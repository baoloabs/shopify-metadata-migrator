import { gql } from "graphql-request"

export const availablePublicationsQuery = gql`
  query availablePublications {
    publications (first: 50) {
      nodes {
        id
        catalog {
          id
          title
        }
        name
      }
    }
  }
`
