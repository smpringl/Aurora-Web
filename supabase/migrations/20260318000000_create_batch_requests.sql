CREATE TABLE batch_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  domains jsonb NOT NULL,
  results jsonb DEFAULT '{}',
  total int NOT NULL,
  completed int DEFAULT 0,
  status text DEFAULT 'processing',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: users can only see their own batch requests
ALTER TABLE batch_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own batch requests" ON batch_requests
  FOR SELECT USING (client_id = auth.uid());
-- Service role bypasses RLS for Edge Function writes
