import { test } from '@playwright/test'
import TurndownService from 'turndown'
import fetch from 'node-fetch'

const turndown = new TurndownService()

const authToken = process.env.GITHUB_ACCESS_TOKEN || ''
const gistId = process.env.GIST_ID || ''

test('hmrc', async ({ page, context }) => {
  await context.clearCookies()

  test.setTimeout(99999999)
  await page.goto(
    'https://www.tax.service.gov.uk/guidance/HMRC-service-dashboard/HMRC-service-dashboard-start'
  )

  const markup = await page.innerHTML('#main-content')

  const text = turndown.turndown(markup)

  const indices = [...text.matchAll(/\n\n[A-Za-z\s]+\n-+/g)].map((m) => m.index)

  let content = 'No data found'

  for (let i = 0; i < indices.length; i++) {
    const fromIndex = indices[i]
    const toIndex = i + 1 < indices.length ? indices[i + 1] : undefined
    let sectionContent = text.substring(fromIndex, toIndex).trim()
    if (sectionContent.startsWith('HMRC service dashboard')) {
      continue
    }

    const components = sectionContent.split(/-+\n/).map((c) => c.trim())
    if (components[0] !== 'Self Assessment') {
      continue
    }

    sectionContent = components.slice(1).join('\n')
    const sectionIdx = sectionContent.indexOf('Tax return amendment')
    if (sectionIdx === -1) {
      continue
    }

    content = sectionContent
    break
  }

  await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      description: new Date(),
      files: {
        'content.md': {
          content,
        },
      },
    }),
  })
})
