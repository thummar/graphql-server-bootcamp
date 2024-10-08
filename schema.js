export const typeDefs = `#graphql
  type Book {
    id: ID!
    title: String!
    about: String!
    isFavorite: Boolean
    authors: [Author!]
    reviews: [BookReview!]
  }
  type BookReview {
    id: ID!
    rating: Int!
    content: String!
    book: Book!
  }
  type Author {
    id: ID!
    name: String!
    about: String!
    isFavorite: Boolean!
    books: [Book!]
    reviews: [AutherReview!]
  }
  type AutherReview {
    id: ID!
    rating: Int!
    content: String!
    author: Author!
  }
  type Query {

    books: [Book]
    book(id: ID!): Book
    bookReviews(id: ID!): [BookReview]

    authors: [Author]
    author(id: ID!): Author
    authorReviews(id: ID!): [AutherReview]
  }
  type Mutation {
    addBookReview(bookID: ID!, review: AddReviewInput!): BookReview
    deleteBookReview(id: ID!): BookReview
    updateBookReview(id: ID!, edits: EditReviewInput): BookReview

    addAuthorReview(authorID: ID!, review: AddReviewInput!): AutherReview
    deleteAuthorReview(id: ID!): AutherReview
    updateAuthorReview(id: ID!, edits: EditReviewInput): AutherReview
  }
  input AddReviewInput {
    rating: String!,
    content: String!
  }
  input EditReviewInput {
    rating: String!,
    content: String!
  }
  type Subscription {
    bookReviewAdded: BookReview
    bookReviewUpdated: BookReview
    bookReviewDeleted: BookReview

    authorReviewAdded: AutherReview
    authorReviewUpdated: AutherReview
    authorReviewDeleted: AutherReview
  }
`