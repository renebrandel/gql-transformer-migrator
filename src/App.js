import './App.css';
import { useState } from 'react';
import { parse, print, visit } from 'graphql'
import { migrateKeys } from './migrators/key'
import { migrateAuth } from './migrators/auth'
import { migrateConnection } from './migrators/connection'

const initialSchema = `
type Post @model {
  id: ID!
  title: String!
  comments: [Comment] @connection(keyName: "byPost", fields: ["id"])
}

type Comment @model
  @key(name: "byPost", fields: ["postID", "content"]) {
  id: ID!
  postID: ID!
  content: String!
  post: Post @connection(fields: ["postID"])
}

type Blog @model {
  id: ID!
  post: Post @connection
}
`

function App() {
  const [schema, setSchema] = useState(initialSchema)
  const [defaultAuthMode, setDefaultAuthMode] = useState('apiKey')

  // potentially prevent people from auto-migrate if they use OIDC?
  // What about ownerField etc.
  // Recheck all default "iam" provider logic

  let output
  try {
    output = parse(schema)
    visit(output, {
      ObjectTypeDefinition: {
        enter(node) {
          migrateKeys(node)
          migrateAuth(node, defaultAuthMode)
          migrateConnection(node, output)
          return node
        }
      }
    })
  } catch (e) { }

  return (
    <div className="App" style={{
      color: 'white',
      height: '100vh',
      padding: 10,
      boxSizing: 'content-box',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'stretch'
    }}>
      <div style={{width: '50%'}}>
        <h2>Schema in Transformer v1</h2>
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          <div>Default auth mode</div>
          <select name="default auth mode" value={defaultAuthMode} onChange={(e) => setDefaultAuthMode(e.target.value)}>
            <option value="apiKey">API Key</option>
            <option value="userPools">Amazon Cognito user pool</option>
            <option value="iam">IAM</option>
            <option value="oidc">OIDC</option>
          </select>
        </div>
        <textarea style={{ width: '90%', minHeight: 600, whiteSpace: 'pre-wrap', display: 'block' }} value={schema} onChange={(e) => setSchema(e.target.value)} />
      </div>
      <div style={{width: '50%'}}>
        <h2>Schema in Transformer v2</h2>
        <div style={{ whiteSpace: 'pre-wrap', textAlign: 'left', fontFamily: 'monospace' }}>
          {print(output)}
        </div>
      </div>
    </div>
  );
}

export default App;
