import { Outlet, useLocation } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { FilterBar } from '../components/FilterBar';
import { EnhancedProjectModal } from '../components/EnhancedProjectModal';
import { useState } from 'react';

export function Layout() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const location = useLocation();

  // Don't show FilterBar on specific pages
  const showFilterBar = !location.pathname.startsWith('/workspace') && 
                        location.pathname !== '/' && 
                        location.pathname !== '/governance' &&
                        location.pathname !== '/admin' &&
                        !location.pathname.startsWith('/project/');

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onCreateProject={() => setIsCreateModalOpen(true)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {showFilterBar && <FilterBar />}
        
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <EnhancedProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}