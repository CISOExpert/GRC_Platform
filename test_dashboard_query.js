const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  console.log('Testing dashboard queries...\n')
  
  const { data: controls, error: controlsError, count } = await supabase
    .from('scf_controls')
    .select('*', { count: 'exact', head: true })
  
  console.log('SCF Controls count:', count)
  if (controlsError) console.error('Error:', controlsError)
  
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('*')
  
  console.log('Organizations:', orgs?.length || 0)
  if (orgsError) console.error('Error:', orgsError)
}

test().catch(console.error)
