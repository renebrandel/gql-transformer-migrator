import { getAuthRules, hasAuthDirectives, addAuthRuleToNode } from '.'
import { createAuthRule } from '../generators'

const defaultAuthModeMap = {
  'apiKey': 'public',
  'iam': 'private',
  'userPools': 'private',
  'oidc': 'private'
}

function getDefaultAuthRule(authMode, rules) {
  const parsedRules = rules.map(rule => ({
    provider: rule.fields.find(r => r.name.value === 'provider'),
    strategy: rule.fields.find(r => r.name.value === 'allow')
  })).map(r => ({
    strategy: r.strategy.value.value,
    provider: r.provider?.value?.value
  }))

  const foundRules = parsedRules.filter(r => r.strategy === defaultAuthModeMap[authMode])
  if (foundRules.length === 0) {
    return null
  }

  if (authMode === "iam" && foundRules.filter(r => r.provider === 'iam').length !== 0) {
    return foundRules.find(r => r.provider === 'iam')
  } else if (authMode === 'iam') {
    return null
  }

  if (foundRules.filter(r => r.provider === undefined || r.provider === authMode).length !== 0) {
    return foundRules.find(r => r.provider === undefined || r.provider === authMode)
  }

  return null
}

export function migrateDefaultAuthMode(node, defaultAuthMode) {
  if (defaultAuthMode === 'iam') {
    return node
  }

  if (!hasAuthDirectives(node)) {
    const authRule = createAuthRule(defaultAuthModeMap[defaultAuthMode], defaultAuthMode)
    addAuthRuleToNode(node, authRule)
    return node
  } else {

    const authRules = getAuthRules(node)

    // if rule with default auth mode exist, then don't mess with it otherwise add it
    const defaultAuthRule = getDefaultAuthRule(defaultAuthMode, authRules)
    if (!defaultAuthRule) {
      addAuthRuleToNode(node, createAuthRule(defaultAuthModeMap[defaultAuthMode], defaultAuthMode))
    }
    return node
  }
}
