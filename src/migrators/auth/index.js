import { isModelType } from '../model'
import { migrateDefaultAuthMode } from './defaultAuth'
import { migrateFieldAuth } from './fieldAuth'
import { migrateOwnerAuth } from './ownerAuth'
import { createArgumentNode, createAuthRule, createDirectiveNode, createListValueNode } from '../generators'

export function hasAuthDirectives(node) {
  return node.directives.some(dir => dir.name.value === 'auth')
}

export function getAuthRules(node) {
  return node.directives.find(dir => dir.name.value === 'auth').arguments[0].value.values
}

export function setAuthRules(node, rules) {
  return node.directives.find(dir => dir.name.value === 'auth').arguments[0].value.values = rules
}

export function addAuthRuleToNode(node, rule) {
  if (!hasAuthDirectives(node)) {
    const authDirArgs = createArgumentNode('rules', createListValueNode([rule]))
    const authDir = createDirectiveNode('auth', [authDirArgs])
    node.directives.push(authDir)
  } else {
    const authRules = getAuthRules(node)
    if (authRules) {
      authRules.push(rule)
    }
  }
}

function getAuthStrategy(rule) {
  return rule.fields.find(f => f.name.value === 'allow').value.value
}

function getAuthOperations(rule) {
  return rule.fields.find(f => f.name.value === 'operations')
    ?.value.values.map(op => op.value)
    ?? ["create", "read", "update", "delete"]
}

export const defaultProviderMap = {
  'public': 'apiKey',
  'private': 'userPools',
  'owner': 'userPools',
  'groups': 'userPools'
}

function getAuthProvider(rule) {
  return rule.fields.find(f => f.name.value === 'provider')
    ?.value.value
    ?? defaultProviderMap[getAuthStrategy(rule)]
}

function getAuthRuleWithSameScopeIndex(rules, rule) {
  let sameRule;
  rules.forEach((r, index) => {
    if (getAuthStrategy(r) === getAuthStrategy(rule) && getAuthProvider(r) === getAuthProvider(rule)) {
      sameRule = index
    }
  })
  return sameRule
}

function mergeOperations(a, b) {
  const aOps = getAuthOperations(a)
  const bOps = getAuthOperations(b)

  const operationsUnion = new Set([aOps, bOps].flat())

  return Array.from(operationsUnion)
}

function mergeAuthRules(node, rules) {
  const newRules = rules.reduce((result, rule) => {
    const existingRuleIndex = getAuthRuleWithSameScopeIndex(result, rule) 
    if (existingRuleIndex !== undefined) {
      result[existingRuleIndex] = createAuthRule(getAuthStrategy(rule), getAuthProvider(rule), mergeOperations(result[existingRuleIndex], rule))
    } else {
      result.push(rule)  
    }
    return result
  }, [])

  setAuthRules(node, newRules.map(r => createAuthRule(getAuthStrategy(r), getAuthProvider(r), getAuthOperations(r))))
}

export function migrateAuth(node, defaultAuthMode) {
  if (!isModelType(node)) {
    return
  }

  migrateFieldAuth(node)

  if (hasAuthDirectives(node)) {
    migrateOwnerAuth(node, defaultAuthMode)
  }

  migrateDefaultAuthMode(node, defaultAuthMode)

  mergeAuthRules(node, getAuthRules(node))
}