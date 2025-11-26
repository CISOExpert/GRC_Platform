import React from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';

type DashboardLayoutProps = { children: React.ReactNode };

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <TopNav />
                <main className="flex-1">{children}</main>
            </div>
        </div>
    );
};

export default DashboardLayout;