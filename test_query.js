const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
)

async function testQuery() {
  console.log('Testing control mappings query...\n')
  
  const { data, error } = await supabase
    .from('scf_control_mappings')
    .select(`
      *,
      scf_control:scf_control_id (
        id,
        control_id,
        title,
        domain,
        description
      ),
      framework:framework_id (
        id,
        code,
        name,
        version
      ),
      external_control:external_control_id (
        id,
        ref_code,
        description,
        metadata
      )
    `)
    .limit(3)

  if (error) {
    console.error('❌ Error:', error)
  } else {
    console.log('✅ Success! Got', data.length, 'mappings')
    console.log(JSON.stringify(data, null, 2))
  }
}

testQuery()
