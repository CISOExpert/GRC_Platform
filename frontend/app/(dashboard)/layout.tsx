'use client'

import React from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import { OrganizationProvider } from '@/lib/contexts/OrganizationContext';

type DashboardLayoutProps = { children: React.ReactNode };

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    return (
        <OrganizationProvider>
            <div className="flex min-h-screen bg-gray-50">
                <Sidebar />
                <div className="flex-1 flex flex-col">
                    <TopNav />
                    <main className="flex-1">{children}</main>
                </div>
            </div>
        </OrganizationProvider>
    );
};

export default DashboardLayout;