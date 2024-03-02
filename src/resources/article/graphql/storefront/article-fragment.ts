import { gql } from "graphql-request"

export const articleFragment = gql`
  fragment ArticleFragment on Article {
    id
    handle
    
    blog {
      title
    }
  }
`
