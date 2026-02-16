import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const Playground = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Playground</CardTitle>
          <CardDescription>
            API playground coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-detail-gray font-sans">
            This section will allow you to test API endpoints interactively.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default Playground
