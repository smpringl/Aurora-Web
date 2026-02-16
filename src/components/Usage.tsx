import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const Usage = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            Usage statistics coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-detail-gray font-sans">
            This section will display your API usage statistics and analytics.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default Usage
