export function isModelType(node) {
    if (node.directives.find(dir => dir.name.value === 'model')) {
        return true
    }
    return false
}