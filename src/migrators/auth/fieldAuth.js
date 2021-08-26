import { addAuthRuleToNode, getAuthRules, hasAuthDirectives } from "."

function hasFieldAuthRules(node) {
  return getFieldsWithAuthRules(node).length !== 0
}

function getFieldsWithAuthRules(node) {
  return node.fields.filter(f => hasAuthDirectives(f))
}

export function migrateFieldAuth(node) {
  if (!hasFieldAuthRules(node)) {
    return
  }

  const fieldWithAuthRules = getFieldsWithAuthRules(node)
  fieldWithAuthRules
    .map(f => getAuthRules(f))
    .flat()
    .forEach(rule => addAuthRuleToNode(node, rule))
}