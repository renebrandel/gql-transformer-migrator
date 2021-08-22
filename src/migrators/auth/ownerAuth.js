import { getAuthRules } from '.'
import { createAuthRule } from '../generators'

function getPrivateAuthRule(rules, provider) {
  return rules.find(rule => {
    const foundStrategy = rule.fields.find(f => f.name.value === "allow").value.value
    const foundProvider = rule.fields.find(f => f.name.value === "provider")?.value?.value

    if (foundStrategy !== 'private') {
      return false
    }

    if (provider === "userPools" && (foundProvider === undefined || foundProvider === "userPools")) {
      return true
    } else if (provider === "iam" && foundProvider === "iam") {
      return true
    }
    return false
  })
}

function getOwnerAuthRules(rules) {
  return rules.filter(rule => rule.fields.find(f => f.name.value === 'allow').value.value === 'owner')
}

export function migrateOwnerAuth(node, defaultAuthMode) {
  const authRules = getAuthRules(node)

  // check if owner-based auth exist and if operations allow everything.
  const deniedOperations = new Set()
  const ownerRules = getOwnerAuthRules(authRules)
  if (ownerRules.length !== 0) {
    ownerRules.forEach(rule => {
      const operationsIndex = rule.fields.findIndex(f => f.name.value === 'operations')

      if (operationsIndex === -1) {
        deniedOperations.add('update')
        deniedOperations.add('read')
        deniedOperations.add('delete')
      } else {
        // remember denied operations
        rule.fields[operationsIndex].value.values.map(op => op.value).forEach(op => deniedOperations.add(op))

        // maintain full CRUD access for owners
        rule.fields.splice(operationsIndex, 1)
      }
    })

    // convert owner auth from deny-others to allow-only basis
    // remove create because it's not a denied operation
    deniedOperations.delete('create')

    const explicitPrivateAllowRule = {
      strategy: 'private',
      provider: defaultAuthMode === "iam" ? "iam" : "userPools",
      operations: ['create', 'read', 'update', 'delete'].filter(x => !deniedOperations.has(x))
    }

    const privateRule = getPrivateAuthRule(authRules, explicitPrivateAllowRule.provider)
    if (!privateRule) {
      authRules.push(createAuthRule(explicitPrivateAllowRule.strategy, explicitPrivateAllowRule.provider, explicitPrivateAllowRule.operations))
    }
  }
  return node
}