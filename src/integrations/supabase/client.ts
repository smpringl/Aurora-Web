import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kfuuqxmaihlwhzfibhvj.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmdXVxeG1haWhsd2h6ZmliaHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2OTMxOTYsImV4cCI6MjA3NDI2OTE5Nn0.JPmC8PZE4xJVaaj7FnDierk0XTTXHOCrI5sbscuQ2mY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
