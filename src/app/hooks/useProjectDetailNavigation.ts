import { useLocation, useNavigate } from 'react-router';

export function useProjectDetailNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const openProjectDetail = (projectId: string) => {
    const params = new URLSearchParams(location.search);
    params.set('project', projectId);

    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { state: { projectOverlay: true } }
    );
  };

  const closeProjectDetail = () => {
    const params = new URLSearchParams(location.search);
    params.delete('project');

    navigate({
      pathname: location.pathname,
      search: params.toString() ? `?${params.toString()}` : '',
    });
  };

  return {
    openProjectDetail,
    closeProjectDetail,
  };
}
