import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const ActivityLogs = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            Activity logs coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-detail-gray font-sans">
            This section will display your API activity and request logs.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default ActivityLogs
