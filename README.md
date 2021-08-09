# GraphQL Nexus w/ Prisma and Apollo Server Boilerplate

That's basic setup of GraphQL server made with Nexus and database connection using Prisma ORM.

## How is it built?

First install nexus, graphql and apollo-server.

```bash
npm i nexus graphql apollo-server
```
To be able to use Typescript, we need to install typescript and ts-node-dev as dev dependencies.

```bash
npm i -D typescript ts-node-dev
```

## Simple tsconfig.json configuration

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "commonjs",
    "lib": ["esnext"],
    "strict": true,
    "rootDir": ".",
    "outDir": "dist",
    "sourceMap": true,
    "esModuleInterop": true
  }
}
```
And add this to package.json scripts

```json
  "dev": "ts-node-dev --transpile-only --no-notify api/index.ts",
  "build": "tsc"
```

## Creating Schema

```typescript
// api/schema.ts
import { makeSchema } from 'nexus'
import { join } from 'path'

export const schema = makeSchema({
  types: [], // 1
  outputs: {
    typegen: join(__dirname, '..', 'nexus-typegen.ts'), // 2
    schema: join(__dirname, '..', 'schema.graphql'), // 3
  },
})
```

// 1 - Here, the 'types' are our schema definitions(covered later).

// 2 - We create types for type-safety.

// 3 - We create SDL version of our GraphQL Schema (classic graphql schemas)

## Instantiate GraphQL server
```typescript
// api/server.ts
import { ApolloServer } from 'apollo-server'
import { schema } from './schema'

export const server = new ApolloServer({ schema })
```

## Starting server
```typescript
// api/index.ts
import { server } from './server.ts'

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`)
})
```
## Creating 'Post' entity

```typescript
// api/graphql/Post.ts
import { objectType } from 'nexus'

export const Post = objectType({
  name: 'Post',            // <- Name of your type
  definition(t) {
    t.int('id')            // <- Field named `id` of type `Int`
    t.string('title')      // <- Field named `title` of type `String`
    t.string('body')       // <- Field named `body` of type `String`
    t.boolean('published') // <- Field named `published` of type `Boolean`
  },
})
```

objectType() is a function that creates a graphql object type. This code above will generate that graphQL type:

```typescript
type Post {
  body: String
  id: Int
  published: Boolean
  title: String
}
``` 
Remember to add every type we want to use to types array in schema.ts

```diff
// api/schema.ts
import { makeSchema } from 'nexus'
import { join } from 'path'
+ import * as types from './graphql'

const schema = makeSchema({
-  types: []
+  types,
  outputs: {
    typegen: join(__dirname, '../nexus-typegen.ts'),
    schema: join(__dirname, '../schema.graphql')
  }
})
```

## Creating Queries

```typescript
// api/graphql/Post.ts
import { objectType, extendType } from 'nexus' 

export const Post = objectType({
   ...
})

export const PostQuery = extendType({
  type: 'Query',                         // 2
  definition(t) {
    t.nonNull.list.field('drafts', {     // 3, 4, 5
      type: 'Post',                      // 6, 7
    })
  },
})
```
Again in Post.ts, we import extendType to extend Query type.

// 2 - type is **'Query'** to extend present Query type with this definition

// 3 - **.notNull** means the value never be **null**

// 4 - **.list** means the output data will be an array like **[Post]**

// 5 - **'drafts'** is the field's name like **drafts: [Post!]**

// 6 - **type: 'Post'** specifies what the field's type should be. Here, a **Post**

This example is equal to this notation:

```typescript
t.field('drafts', {
  type: nonNull(list('Post')),
})
```

## Ok, now let's define the resolver

What is so cool about Nexus is that we specifiy all needed aspects basically in one place.
```diff
// api/graphql/Post.ts
import { extendType } from 'nexus'
// ...
export const PostQuery = extendType({
  type: 'Query',
  definition(t) {
    t.nonNull.list.field('drafts', {
      type: 'Post',
+      resolve() {
+        return [{ id: 1, title: 'Nexus', body: '...', published: false }]
+      },
    })
  },
})
```

Psss.. that's just mocked data for now, but i'll fix it later.

## Wire up the context
Create new file which gonna be the fake database.

```typescript
// api/db.ts
export interface Post {
  id: number
  title: string
  body: string
  published: boolean
}

export interface Db {
  posts: Post[]
}

export const db: Db = {
  posts: [{ id: 1, title: 'Nexus', body: '...', published: false }],
}
```

Now we need to connect this database to GraphQL Server through context. 

Create **context.ts**
```typescript
// api/context.ts
import { Db, db } from './db'

export interface Context {
  db: Db
}

export const context = {
  db
}
```
And now pass it as the second parameter in ApolloServer instance.
```diff
// api/server.ts
import { ApolloServer } from 'apollo-server'
import { context } from './context'
import { schema } from './schema'

export const server = new ApolloServer({
  schema,
+  context 
})
```

Also need to configure context in nexus

```diff
// api/schema.ts
import { makeSchema } from 'nexus'
import { join } from 'path'
import * as types from './graphql'

export const schema = makeSchema({
  types,
  outputs: {
    typegen: join(__dirname, '..', 'nexus-typegen.ts'),
    schema: join(__dirname, '..', 'schema.graphql')
  },
+  contextType: {                                    // 1
+    module: join(__dirname, "./context.ts"),        // 2
+    export: "Context",                              // 3
+  },
})
```

## Consume the context
```diff
// api/graphql/Post.ts
export const PostQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('drafts', {
      type: 'Post',
-      resolve() {
-        return [{ id: 1, title: 'Nexus', body: '...', published: false }]
+      resolve(_root, _args, ctx) {                              // 1
+        return ctx.db.posts.filter(p => p.published === false)  // 2
+      },
    })
  },
})
```
Context is the third **ctx** argument.

## Create mutation

```typescript
// api/graphql/Post.ts
import { objectType, extendType } from 'nexus' 

export const Post = objectType({
   ...
})

export const PostQuery = extendType({
  type: 'Query',                        
  ...
})

export const PostMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.nonNull.field('createDraft', {
      type: 'Post',
      resolve(_root, args, ctx) {
        ctx.db.posts.push(/*...*/)
        return // ...
      },
    })
  },
})

```

## Now add Prisma
```bash
npm i @prisma/client 
npm i --save-dev prisma
```
```bash
npx prisma init
```
The command creates a new directory called prisma which will contain a schema.prisma file and add a .env file at the root of your project.

**in .env**
```typescript
DATABASE_URL="postgresql://postgres:password@localhost:5432/myapp"
```
**Do the migation**

```bash
npx prisma migrate dev --name init --preview-feature
```
This will create a database migration called init. Once the first migration is complete, the Prisma CLI will install **@prisma/client** package.

## Access the database
```diff
// api/db.ts
+ import { PrismaClient } from '@prisma/client'

export const db = new PrismaClient()

- export interface Post {
-   id: number
-   title: string
-   body: string
-   published: boolean
- }

- export interface Db {
-   posts: Post[]
- }

- export const db: Db = {
-   posts: [{ id: 1, title: 'Nexus', body: '...', published: false }],
- }
```

