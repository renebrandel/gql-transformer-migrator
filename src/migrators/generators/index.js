import { parseValue } from "graphql"
import { defaultProviderMap } from "../auth"

export function createNameNode(name) {
    return {
        kind: 'Name',
        value: name
    }
}

export function createDirectiveNode(name, args) {
    return {
        kind: 'Directive',
        name: createNameNode(name),
        arguments: args
    }
}

export function createArgumentNode(name, value) {
    return {
        kind: 'Argument',
        name: createNameNode(name),
        value: value
    }
}

export function createListValueNode(values) {
    return {
        kind: 'ListValue',
        values: values
    }
}

export function createAuthRule(strategy, provider, operations) {
    let rule = `{allow: ${strategy}`
    if (provider && provider !== defaultProviderMap[strategy]) {
        rule += `, provider: ${provider}`
    }

    if (operations && operations.length !== 4) {
        rule += `, operations: [${operations.join(', ')}]`
    } 
    rule += '}'
    return parseValue(rule)
}