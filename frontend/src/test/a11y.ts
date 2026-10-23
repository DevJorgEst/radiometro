import axe from 'axe-core'
import { expect } from 'vitest'

// jsdom no calcula layout ni color: las reglas que dependen de eso no son
// evaluables aquí. El resto (roles, nombres accesibles, labels, ARIA) sí.
const RULES = {
  'color-contrast': { enabled: false },
  'landmark-one-main': { enabled: false },
  'page-has-heading-one': { enabled: false },
  region: { enabled: false },
}

export async function expectNoA11yViolations(container: HTMLElement) {
  const { violations } = await axe.run(container, { rules: RULES })

  const summary = violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} → ${violation.nodes
        .map((node) => node.target.join(' '))
        .join(', ')}`,
  )

  expect(summary).toEqual([])
}
