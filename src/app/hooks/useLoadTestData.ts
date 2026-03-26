import { useProjects } from '../context/ProjectContext';
import { useEAP } from '../context/EAPContext';
import { useTasks } from '../context/TaskContext';
import { testEAPTemplate, testProjectData, testTasksData } from '../utils/testData';

/**
 * Hook para carregar dados de teste manualmente
 * Uso: const { loadTestData } = useLoadTestData();
 * Depois: loadTestData();
 */
export function useLoadTestData() {
  const { addProject } = useProjects();
  const { addEAPTemplate } = useEAP();
  const { addTask } = useTasks();

  const loadTestData = () => {
    try {
      // 1. Adicionar EAP template
      addEAPTemplate(testEAPTemplate);

      // 2. Adicionar projeto com fases datadas
      addProject(testProjectData);

      // 3. Adicionar tasks
      testTasksData.forEach((task) => {
        addTask(task);
      });

      console.log('✅ Dados de teste carregados!');
      console.log('📊 Acesse o projeto: "🧪 Projeto Teste - Gantt"');
    } catch (error) {
      console.error('❌ Erro ao carregar dados de teste:', error);
    }
  };

  return { loadTestData };
}
