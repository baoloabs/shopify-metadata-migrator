import { gql } from "graphql-request"
import { articleFragment } from "./article-fragment"

export const articleByIdQuery = gql`
  ${articleFragment}

  query articleById($id: ID!) {
    record: article(id: $id) {
      ...ArticleFragment
    }
  }
`
