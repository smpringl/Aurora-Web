import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const Overview = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>
            Dashboard overview coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-detail-gray font-sans">
            This section will display your account overview and key metrics.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default Overview
