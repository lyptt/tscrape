const { execSync } = require('node:child_process')
const TurndownService = require('turndown')
const fetch = require('node-fetch').default

const td = new TurndownService()

const authToken = process.env.GITHUB_ACCESS_TOKEN || ''
const gistId = process.env.GIST_ID || ''

async function scrape() {
  const command = execSync(
    `curl 'https://www.tax.service.gov.uk/guidance/HMRC-service-dashboard/HMRC-service-dashboard-start' -X 'GET' -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' -H 'Pragma: no-cache' -H 'Cookie: mdtp=SRUg6R2hErAsoIITWDEZncuhVBmNbxoBZTP6tvn3Fd9s03sejthvNLIwWAEgt7+hcuA2FEnd/JY5W9Rvi+HENQ2bZITUwifRQjOcq4suKqivqkUXvOcHRf/x+HzdNtxxEi6hUwm9/zHS1CVvWpr1us8EvuaqlVPtU9CfDeiUCIojShaVTOwPvv1RybMWCvmp5YKQ1mQrxpZnusaSZ6Sli2MYODmCxj5jIGUyWuurrrYaURRellHAuuRKCIESAaET0Kpwc9EET3h2beNHRL0A7q2xfN0sSiiLZKyae8+c9hCROQIQprtMVQzA; mdtpdi=mdtpdi#c90b4698-ba4f-4b26-b382-c062c1e16b76#1646142793582_uyhpAnCR4NsuEsm+GVcmjA==; mdtpdf=eyJ1c2VyQWdlbnQiOiJNb3ppbGxhLzUuMCAoTWFjaW50b3NoOyBJbnRlbCBNYWMgT1MgWCAxMF8xNV83KSBBcHBsZVdlYktpdC82MDUuMS4xNSAoS0hUTUwsIGxpa2UgR2Vja28pIFZlcnNpb24vMTYuMiBTYWZhcmkvNjA1LjEuMTUiLCJsYW5ndWFnZSI6ImVuLVVTIiwiY29sb3JEZXB0aCI6MjQsInJlc29sdXRpb24iOiI5MDB4MTQ0MCIsInRpbWV6b25lIjozNjAsImNsaWVudFNpZGVUaW1lc3RhbXAiOjE2NzQxODMwOTA2OTYsInNlc3Npb25TdG9yYWdlIjp0cnVlLCJsb2NhbFN0b3JhZ2UiOnRydWUsImluZGV4ZWREQiI6dHJ1ZSwicGxhdGZvcm0iOiJNYWNJbnRlbCIsImRvTm90VHJhY2siOmZhbHNlLCJudW1iZXJPZlBsdWdpbnMiOjEsInBsdWdpbnMiOlsiV2ViS2l0IGJ1aWx0LWluIFBERiJdfQ==; mdtpurr=suppress_for_all_services' -H 'Accept-Encoding: gzip, deflate, br' -H 'Cache-Control: no-cache' -H 'Host: www.tax.service.gov.uk' -H 'Accept-Language: en-US,en;q=0.9' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Safari/605.1.15' -H 'Referer: https://www.tax.service.gov.uk/guidance/HMRC-service-dashboard/session-timeout' -H 'Connection: keep-alive'`
  )

  console.log(command.toString('utf8'))

  const text = td.turndown(command.toString('utf8'))

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
}

;(async () => {
  await scrape()
})()
