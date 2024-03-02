import { gql } from "graphql-request"
import { articleFragment } from "./article-fragment"

export const articleByIdentifierQuery = gql`
  ${articleFragment}

  query articleByIdentifier($first: Int!, $after: String, $query: String) {
    articles(first: $first, after: $after, query: $query) {
      nodes {
        ...ArticleFragment   
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`
