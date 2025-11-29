'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useOrganizationContext } from '@/lib/contexts/OrganizationContext'

interface Organization {
    id: string
    name: string
}

const TopNav = () => {
    const router = useRouter()
    const supabase = createClient()
    const [userEmail, setUserEmail] = useState<string>('')
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [showOrgDropdown, setShowOrgDropdown] = useState(false)

    // Use the shared organization context
    const { currentOrgId, setCurrentOrgId } = useOrganizationContext()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.email) {
                setUserEmail(user.email)
            }
        }
        getUser()

        const fetchOrganizations = async () => {
            console.log('[TopNav] Fetching organizations...')

            const { data, error } = await supabase
                .from('organizations')
                .select('id, name')
                .order('name')

            if (error) {
                console.error('[TopNav] Organizations Error:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                })
            } else if (data) {
                console.log('[TopNav] Organizations loaded:', data.length)
                setOrganizations(data)
            }
        }
        fetchOrganizations()
    }, [supabase])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Breadcrumb / Page Title */}
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
                    <p className="text-sm text-gray-500">Welcome back to your GRC workspace</p>
                </div>

                {/* Organization Switcher & User Menu */}
                <div className="flex items-center gap-4">
                    {/* Organization Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            suppressHydrationWarning
                        >
                            <span>
                                {!currentOrgId
                                    ? 'All Organizations (Admin)'
                                    : organizations.find(o => o.id === currentOrgId)?.name || 'Select Organization'
                                }
                            </span>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {showOrgDropdown && (
                            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            setCurrentOrgId(null)
                                            setShowOrgDropdown(false)
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                                            !currentOrgId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                                        }`}
                                        suppressHydrationWarning
                                    >
                                        All Organizations (Admin View)
                                    </button>
                                    {organizations.length > 0 && (
                                        <div className="border-t border-gray-200 mt-1 pt-1">
                                            {organizations.map((org) => (
                                                <button
                                                    key={org.id}
                                                    onClick={() => {
                                                        setCurrentOrgId(org.id)
                                                        setShowOrgDropdown(false)
                                                    }}
                                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                                                        currentOrgId === org.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                                                    }`}
                                                    suppressHydrationWarning
                                                >
                                                    {org.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">{userEmail}</p>
                        <p className="text-xs text-gray-500">Admin</p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </header>
    )
}

export default TopNav