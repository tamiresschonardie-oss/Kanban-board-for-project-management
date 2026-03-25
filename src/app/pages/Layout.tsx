import { Outlet } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { EnhancedProjectModal } from '../components/EnhancedProjectModal';
import { useState } from 'react';

export function Layout() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onCreateProject={() => setIsCreateModalOpen(true)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
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