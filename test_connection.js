// Test Supabase connection from frontend
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('Testing Supabase connection...')
  console.log('URL:', supabaseUrl)
  
  try {
    // Test query
    const { data, error, count } = await supabase
      .from('scf_controls')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('Error:', error)
      return
    }
    
    console.log('✓ Connection successful!')
    console.log('✓ Found', count, 'controls in database')
    
    // Test actual data fetch
    const { data: controls, error: fetchError } = await supabase
      .from('scf_controls')
      .select('control_id, title, domain')
      .limit(5)
    
    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return
    }
    
    console.log('✓ Sample controls:')
    controls.forEach(c => {
      console.log(`  - ${c.control_id}: ${c.title.substring(0, 50)}...`)
    })
    
  } catch (err) {
    console.error('Exception:', err)
  }
}

testConnection()
