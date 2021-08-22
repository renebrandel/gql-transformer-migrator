export function getFieldsWithConnection(fields) {
  return fields.filter(field => field.directives.find(d => d.name.value === "connection"))
}

export function getConnectionFieldsArg(connection) {
  return connection.arguments.find(a => a.name.value === "fields").value.values.map(v => v.value)
}

export function isFieldIndex(field) {
  return !!field.directives.find(dir => dir.name.value === "index")
}

export function getConnectionDirective(field) {
  return field.directives.find(d => d.name.value === "connection" || d.name.value === 'hasMany' || d.name.value === 'hasOne' || d.name.value === 'belongsTo')
}

function getRelatedType(output, relatedTypeName) {
  const relatedType = output.definitions.find(
    d => d.kind === "ObjectTypeDefinition" && d.name.value === relatedTypeName,
  )

  return relatedType;
}

function getFieldType(field) {
  if (field.type.kind === 'NamedType') {
    return field.type.name.value
  } else {
    return getFieldType(field.type)
  }
}

function isListType(field) {
  if (field.type.kind === 'ListType') {
    return true
  } else if (field.type.kind === 'NamedType') {
    return false
  } else {
    return isListType(field.type)
  }
}

export function migrateConnection(node, ast) {
  const connections = getFieldsWithConnection(node.fields)
  if (connections.length === 0) {
    return node
  }

  connections.forEach(connectionField => {
    const connectionDirective = getConnectionDirective(connectionField)
    if (isListType(connectionField)) {
      connectionDirective.name.value = "hasMany"
      connectionDirective.arguments.find(a => a.name.value === "keyName").name.value = "indexName"
    } else {
      const relatedType = getRelatedType(ast, getFieldType(connectionField))
      const isBiDirectionalRelation = relatedType.fields.some(relatedField => {
        if (getFieldType(relatedField) !== node.name.value) {
          return false
        }

        if (connectionDirective.arguments.length === 0) {
          return false
        }

        const fieldsArg = node.fields.find(f => f.name.value === getConnectionFieldsArg(connectionDirective)[0])
        if (fieldsArg && !isFieldIndex(fieldsArg)) {
          return false
        }

        return relatedField.directives.some(relatedDirective => {
          const validConnectionDirectiveNames = new Set(["hasOne", "hasMany", "connection"])
          if (validConnectionDirectiveNames.has(relatedDirective.name.value)) {
            return true
          } else {
            return false
          }
        })
      })

      if (isBiDirectionalRelation) {
        connectionDirective.name.value = "belongsTo"
      } else {
        connectionDirective.name.value = "hasOne"
      }
    }
  })

  return node
}
