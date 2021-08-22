import { createArgumentNode, createDirectiveNode } from "../generators"

export function isPrimaryKey(directive) {
    if (directive.name.value === 'key'
        && directive.arguments.find(a => a.name.value === "fields")
        && !directive.arguments.find(a => a.name.value === "name")) {
        return true
    }
    return false
}

export function migratePrimaryKey(node, directive) {
    let fields = directive.arguments.find(i => i.name.value === "fields")
    const fieldIndex = node.fields.findIndex(field => field.name.value === fields.value.values[0].value)
    let args = []
    if (fields.value.values.length !== 1) {
        args = [createArgumentNode('sortKeyFields', {
                ...fields.value,
                values: fields.value.values.slice(1)
            }
        )]
    }
    node.fields[fieldIndex].directives.push(createDirectiveNode('primaryKey', args))
    return node
}

export function isSecondaryKey(directive) {
    if (directive.name.value === 'key'
        && directive.arguments.find(a => a.name.value === "fields")
        && directive.arguments.find(a => a.name.value === "name")) {
        return true
    }
    return false
}

export function migrateSecondaryKey(node, directive) {
    let fields = directive.arguments.find(i => i.name.value === "fields")
    const fieldIndex = node.fields.findIndex(field => field.name.value === fields.value.values[0].value)
    let args = directive.arguments.filter(i => i.name.value !== "fields")
    if (fields.value.values.length !== 1) {
        args = [...args, createArgumentNode(
            'sortKeyFields', {
                ...fields.value,
                values: fields.value.values.slice(1)
            },
        )]
    }
    node.fields[fieldIndex].directives.push(createDirectiveNode('index', args))
    return node
}

export function migrateKeys(node) {
    const dirs = node.directives
    if (!dirs) {
        return node
    }
    let keys = []
    for (const dir of dirs) {
        if (dir.name.value === 'key') {
            keys.push(dir)
        }
    }
    node.directives = dirs.filter(dir => dir.name.value !== "key")
    for (const index of keys) {
        if (isPrimaryKey(index)) {
            migratePrimaryKey(node, index)
        } else if (isSecondaryKey(index)) {
            migrateSecondaryKey(node, index)
        }
    }
    return node
}