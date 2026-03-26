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
      console.log('========================================');
      console.log('🧪 INICIANDO CARREGAMENTO DE DADOS TESTE');
      console.log('========================================');

      // DEBUG: Verificar testProjectData antes de salvar
      console.log('📊 Projeto:', testProjectData.id, testProjectData.name);
      console.log('📊 Total de fases:', testProjectData.phases?.length);
      console.table(testProjectData.phases?.map(p => ({
        id: p.id,
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        order: p.order,
      })));

      // 1. Adicionar EAP template
      addEAPTemplate(testEAPTemplate);
      console.log('✅ EAP template adicionado');

      // 2. Adicionar projeto com fases datadas
      addProject(testProjectData);
      console.log('✅ Projeto adicionado');

      // 3. Adicionar tasks
      testTasksData.forEach((task) => {
        addTask(task);
      });
      console.log(`✅ ${testTasksData.length} tasks adicionadas`);

      console.log('========================================');
      console.log('✅ DADOS DE TESTE CARREGADOS COM SUCESSO!');
      console.log('========================================');
      console.log('📊 Projeto: "🧪 Projeto Teste - Gantt"');
      console.log('📊 ID: test-project-gantt');
      console.log('📊 Fases: 4 (Análise, Desenvolvimento, Testes, Implantação)');
      console.log('========================================');
    } catch (error) {
      console.error('❌ ERRO ao carregar dados de teste:', error);
    }
  };

  return { loadTestData };
}
