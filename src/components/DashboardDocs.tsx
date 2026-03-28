import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-1.5 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-gray-500" />
      )}
    </button>
  )
}

function CodeBlock({ children, copyText }: { children: string; copyText?: string }) {
  return (
    <div className="relative">
      <pre className="bg-gray-100 text-gray-800 rounded-lg px-5 py-4 text-[13px] font-mono leading-relaxed overflow-x-auto">
        {children}
      </pre>
      <CopyButton text={copyText || children} />
    </div>
  )
}

const curlExample = `curl -X POST https://api.auroracarbon.com/v1/ghg/latest \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"domain": "microsoft.com"}'`

const pythonExample = `import requests

response = requests.post(
    "https://api.auroracarbon.com/v1/ghg/latest",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_API_KEY",
    },
    json={"domain": "microsoft.com"},
)

data = response.json()
print(data)`

const jsExample = `const response = await fetch("https://api.auroracarbon.com/v1/ghg/latest", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY",
  },
  body: JSON.stringify({ domain: "microsoft.com" }),
});

const data = await response.json();
console.log(data);`

const successResponse = `{
  "status": "ok",
  "company": "Microsoft Corporation",
  "year": 2024,
  "methodology": "reported",
  "total_emissions_tco2e": 29800000,
  "scope1_emissions_tco2e": 289000,
  "scope2_emissions_tco2e": 521000,
  "scope2_basis": "market-based",
  "scope3_emissions_tco2e": 28829000
}`

const noDataResponse = `{
  "status": "data_not_available",
  "reason": "Emissions data is not currently available for this company."
}`

const errorResponses = `// 401 — Invalid or missing API key
{
  "status": "error",
  "reason": "API key required. Use Authorization: Bearer <key>"
}

// 400 — Missing domain
{
  "status": "error",
  "reason": "Missing required field: domain"
}

// 429 — Rate limit exceeded
{
  "status": "error",
  "reason": "Rate limit exceeded. Try again shortly."
}`

type Tab = 'curl' | 'python' | 'javascript'

const DashboardDocs = () => {
  const [activeTab, setActiveTab] = useState<Tab>('curl')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'curl', label: 'cURL' },
    { key: 'python', label: 'Python' },
    { key: 'javascript', label: 'JavaScript' },
  ]

  const examples: Record<Tab, string> = {
    curl: curlExample,
    python: pythonExample,
    javascript: jsExample,
  }

  return (
    <div>
      {/* Header */}
      <div className="pb-8">
        <h1 className="text-[36px] font-semibold tracking-[-0.02em] leading-[1.2] text-gray-900">
          API Docs
        </h1>
        <p className="text-gray-500 mt-1 text-[15px]">
          One endpoint, one request, structured emissions data back
        </p>
      </div>

      <div className="space-y-4">
        {/* Base URL */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white">
          <h2 className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em] mb-4">Base URL</h2>
          <div className="bg-gray-100 rounded-lg px-5 py-3 inline-block">
            <code className="text-[14px] font-mono text-gray-800">https://api.auroracarbon.com</code>
          </div>
        </div>

        {/* Authentication */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white">
          <h2 className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em] mb-4">Authentication</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-4 max-w-2xl">
            All requests require an API key passed in the <code className="text-[13px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">Authorization</code> header as a Bearer token.
          </p>
          <div className="bg-gray-100 rounded-lg px-5 py-3 inline-block">
            <code className="text-[13px] font-mono text-gray-800">Authorization: Bearer YOUR_API_KEY</code>
          </div>
          <p className="text-sm text-gray-400 mt-4">
            Manage your key in the <a href="#api-key" className="text-gray-900 underline underline-offset-2 hover:text-black">API Key</a> tab.
          </p>
        </div>

        {/* Endpoint */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white">
          <h2 className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em] mb-4">Endpoint</h2>
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-gray-900 text-white px-3 py-1 rounded-md text-xs font-mono font-medium">POST</span>
            <code className="text-[14px] font-mono text-gray-900">/v1/ghg/latest</code>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed max-w-2xl mb-6">
            Returns the most recent greenhouse gas emissions data for a company identified by its domain.
          </p>

          <h4 className="text-sm font-semibold text-gray-900 mb-3">Request body</h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Parameter</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Required</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-5 py-3 font-mono text-[13px] text-gray-900">domain</td>
                  <td className="px-5 py-3 text-gray-500">string</td>
                  <td className="px-5 py-3 text-gray-500">Yes</td>
                  <td className="px-5 py-3 text-gray-500">Company domain (e.g. <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 text-[12px]">microsoft.com</code>)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 className="text-sm font-semibold text-gray-900 mb-3">Response fields</h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Field</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { field: 'status', type: 'string', desc: '"ok" or "data_not_available"' },
                  { field: 'company', type: 'string', desc: 'Resolved company name' },
                  { field: 'year', type: 'number', desc: 'Emissions data year' },
                  { field: 'methodology', type: 'string', desc: '"reported", "partially_reported", or "estimated"' },
                  { field: 'total_emissions_tco2e', type: 'number | null', desc: 'Total GHG emissions in tonnes CO\u2082e' },
                  { field: 'scope1_emissions_tco2e', type: 'number | null', desc: 'Scope 1 \u2014 direct emissions' },
                  { field: 'scope2_emissions_tco2e', type: 'number | null', desc: 'Scope 2 \u2014 indirect (energy) emissions' },
                  { field: 'scope2_basis', type: 'string | null', desc: '"market-based" or "location-based"' },
                  { field: 'scope3_emissions_tco2e', type: 'number | null', desc: 'Scope 3 \u2014 value chain emissions' },
                  { field: 'reason', type: 'string', desc: 'Explanation (only when data_not_available)' },
                ].map((row, i) => (
                  <tr key={row.field} className={i < 9 ? 'border-b border-gray-100' : ''}>
                    <td className="px-5 py-3 font-mono text-[13px] text-gray-900">{row.field}</td>
                    <td className="px-5 py-3 font-mono text-[12px] text-gray-400">{row.type}</td>
                    <td className="px-5 py-3 text-gray-500">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Start */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white">
          <h2 className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em] mb-4">Quick Start</h2>
          <div className="flex gap-1 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <CodeBlock copyText={examples[activeTab]}>{examples[activeTab]}</CodeBlock>
        </div>

        {/* Response Examples */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white">
          <h2 className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em] mb-4">Response Examples</h2>

          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <h4 className="text-sm font-semibold text-gray-900">Success</h4>
                <span className="text-[11px] font-mono text-gray-400 ml-1">200</span>
              </div>
              <p className="text-sm text-gray-500 mb-3">Emissions data returned for the requested company.</p>
              <CodeBlock>{successResponse}</CodeBlock>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                <h4 className="text-sm font-semibold text-gray-900">No data available</h4>
                <span className="text-[11px] font-mono text-gray-400 ml-1">200</span>
              </div>
              <p className="text-sm text-gray-500 mb-3">Data is not yet available for this company. Retry later — processing may be in progress.</p>
              <CodeBlock>{noDataResponse}</CodeBlock>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <h4 className="text-sm font-semibold text-gray-900">Errors</h4>
                <span className="text-[11px] font-mono text-gray-400 ml-1">400 / 401 / 429</span>
              </div>
              <CodeBlock>{errorResponses}</CodeBlock>
            </div>
          </div>
        </div>

        {/* Methodology */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white">
          <h2 className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em] mb-4">Methodology</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] rounded-full px-2.5 py-0.5 text-black" style={{ backgroundColor: '#B3FD00' }}>reported</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                All three scopes extracted from the company's published sustainability or annual report. Highest confidence.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] rounded-full px-2.5 py-0.5 text-black bg-gray-200">partially_reported</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Some scopes extracted from reports, others estimated from sector peers. Enrichment runs in the background to fill gaps.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] rounded-full px-2.5 py-0.5 text-black bg-gray-200">estimated</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Emissions estimated using sector intensity coefficients and company revenue. Returned while report extraction runs asynchronously.
              </p>
            </div>
          </div>
        </div>

        {/* Rate Limits & Notes */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white">
          <h2 className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em] mb-4">Rate Limits</h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden inline-block mb-8">
            <table className="text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Limit</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Window</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Response</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-5 py-3 font-mono text-[13px] text-gray-900">100 requests</td>
                  <td className="px-5 py-3 text-gray-500">Per minute</td>
                  <td className="px-5 py-3 text-gray-500"><code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 text-[12px]">429</code> with <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 text-[12px]">Retry-After</code> header</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-[13px] font-medium text-gray-500 uppercase tracking-[0.05em] mb-4">Notes</h2>
          <ul className="space-y-3 max-w-2xl">
            <li className="flex items-start gap-3">
              <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0 mt-2"></span>
              <span className="text-sm text-gray-500">Subsidiary domains resolve to the parent company automatically (e.g. <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 text-[12px]">youtube.com</code> returns Alphabet/Google data).</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0 mt-2"></span>
              <span className="text-sm text-gray-500">First lookup for a new company may return estimated data. Retry after a few minutes to get reported data once extraction completes.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0 mt-2"></span>
              <span className="text-sm text-gray-500">The <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 text-[12px]">year</code> field reflects the emissions data year, which is typically the report publication year minus one.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0 mt-2"></span>
              <span className="text-sm text-gray-500">Cached lookups return in under 500ms. New company lookups that require onboarding may take 15–25 seconds on the first request.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default DashboardDocs
