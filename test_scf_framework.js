const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
  console.log('Checking for SCF framework...\n')
  
  // Get all frameworks
  const { data: allFrameworks, error: allError } = await supabase
    .from('frameworks')
    .select('*')
    .order('name')
  
  if (allError) {
    console.error('Error fetching frameworks:', allError)
    return
  }
  
  console.log('All frameworks:', allFrameworks.length)
  allFrameworks.forEach(f => {
    console.log(`  - ${f.code}: ${f.name} (ID: ${f.id})`)
  })
  
  // Find SCF specifically
  const scf = allFrameworks.find(f => f.code === 'SCF')
  console.log('\nSCF Framework:', scf ? `Found - ${scf.name} (ID: ${scf.id})` : 'NOT FOUND')
  
  // Test RPC function
  console.log('\nTesting get_frameworks_with_counts RPC...')
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_frameworks_with_counts')
  
  if (rpcError) {
    console.error('RPC Error:', rpcError)
    return
  }
  
  console.log('RPC returned:', rpcData.length, 'frameworks')
  const scfInRpc = rpcData.find(f => f.code === 'SCF')
  console.log('SCF in RPC results:', scfInRpc ? `Found - ${scfInRpc.name} (ID: ${scfInRpc.id})` : 'NOT FOUND')
}

test().catch(console.error)
