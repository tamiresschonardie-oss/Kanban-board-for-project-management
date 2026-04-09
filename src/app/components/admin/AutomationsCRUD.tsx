import { ReactNode, useMemo, useState } from 'react';
import { Bot, Mail, Plus, Power, PowerOff, Trash2, Wand2 } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { EmailTemplate, AutomationRule } from '../../types';
import { useFeedback } from '../../context/FeedbackContext';
import { useProjects } from '../../context/ProjectContext';
import {
  AUTOMATION_ACTION_OPTIONS,
  AUTOMATION_EVENT_OPTIONS,
} from '../../utils/automationEngine';
import { getProjectCurrentGovernancePhase, getProjectGovernancePhaseId } from '../../utils/projectSelectors';
import { SearchableMultiSelect } from '../filters/SearchableMultiSelect';
import { AdminResponsiveModal } from './AdminResponsiveModal';

type RuleFormState = {
  name: string;
  description: string;
  event: AutomationRule['event'];
  projectIds: string[];
  teamNames: string[];
  productNames: string[];
  statuses: string[];
  phaseIds: string[];
  actionType: AutomationRule['action']['type'];
  emailTemplateId: string;
  recipients: Array<'responsible' | 'requester' | 'stakeholders' | 'current_user' | 'admins_and_pmo' | 'custom'>;
  customEmails: string;
  notificationRecipient: 'responsible' | 'requester' | 'current_user' | 'admins_and_pmo';
  notificationTitle: string;
  notificationMessage: string;
  targetTaskStatus: string;
  targetProjectField: string;
  targetProjectValue: string;
  taskTemplateId: string;
};

type EmailTemplateFormState = {
  nome: string;
  assunto: string;
  corpo_html: string;
  ativo: boolean;
};

const EMPTY_RULE_FORM: RuleFormState = {
  name: '',
  description: '',
  event: 'project.phase.changed',
  projectIds: [],
  teamNames: [],
  productNames: [],
  statuses: [],
  phaseIds: [],
  actionType: 'send_email',
  emailTemplateId: '',
  recipients: ['stakeholders'],
  customEmails: '',
  notificationRecipient: 'responsible',
  notificationTitle: '',
  notificationMessage: '',
  targetTaskStatus: 'in_progress',
  targetProjectField: '',
  targetProjectValue: '',
  taskTemplateId: '',
};

const EMPTY_EMAIL_TEMPLATE_FORM: EmailTemplateFormState = {
  nome: '',
  assunto: '',
  corpo_html: '',
  ativo: true,
};

const EMAIL_VARIABLES = [
  '{{project_name}}',
  '{{responsavel}}',
  '{{cliente}}',
  '{{fase_atual}}',
  '{{data_prevista}}',
  '{{link_projeto}}',
  '{{solicitante}}',
  '{{equipe}}',
];

export function AutomationsCRUD() {
  const {
    automationRules,
    automationExecutions,
    addAutomationRule,
    updateAutomationRule,
    deleteAutomationRule,
    toggleAutomationRule,
    emailTemplates,
    addEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    taskTemplates,
    teams,
    products,
  } = useAdmin();
  const { projects } = useProjects();
  const { showFeedback } = useFeedback();
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(EMPTY_RULE_FORM);
  const [editingEmailTemplate, setEditingEmailTemplate] = useState<EmailTemplate | null>(null);
  const [emailTemplateForm, setEmailTemplateForm] = useState<EmailTemplateFormState>(EMPTY_EMAIL_TEMPLATE_FORM);

  const projectOptions = useMemo(
    () => projects.map((project) => ({ value: project.id, label: project.name })),
    [projects]
  );
  const teamOptions = useMemo(
    () => teams.map((team) => ({ value: team.name, label: team.name })),
    [teams]
  );
  const productOptions = useMemo(
    () => products.map((product) => ({ value: product.name, label: product.name })),
    [products]
  );
  const phaseOptions = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((project) => {
      const id = getProjectGovernancePhaseId(project);
      map.set(id, getProjectCurrentGovernancePhase(project)?.name || id);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [projects]);
  const statusOptions = useMemo(
    () => [
      { value: 'not_started', label: 'Não iniciada' },
      { value: 'in_progress', label: 'Em andamento' },
      { value: 'blocked', label: 'Bloqueada' },
      { value: 'done', label: 'Concluída' },
    ],
    []
  );
  const taskTemplateOptions = useMemo(
    () =>
      taskTemplates
        .filter((template) => template.isActive)
        .map((template) => ({ value: template.id, label: template.name })),
    [taskTemplates]
  );
  const emailTemplateOptions = useMemo(
    () =>
      emailTemplates
        .filter((template) => template.ativo)
        .map((template) => ({ value: template.id, label: template.nome })),
    [emailTemplates]
  );

  const sortedRules = useMemo(
    () => [...automationRules].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [automationRules]
  );
  const sortedEmailTemplates = useMemo(
    () => [...emailTemplates].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [emailTemplates]
  );

  const openCreateRule = () => {
    setEditingRule(null);
    setRuleForm({
      ...EMPTY_RULE_FORM,
      emailTemplateId: emailTemplates.find((template) => template.ativo)?.id || '',
      taskTemplateId: taskTemplates.find((template) => template.isActive)?.id || '',
    });
    setIsRuleModalOpen(true);
  };

  const openEditRule = (rule: AutomationRule) => {
    const conditions = rule.conditions || [];
    const getValues = (field: string) =>
      conditions.find((condition) => condition.field === field)?.values ||
      conditions
        .find((condition) => condition.field === field)
        ?.value.split(',')
        .map((item) => item.trim())
        .filter(Boolean) ||
      [];

    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      description: rule.description || '',
      event: rule.event,
      projectIds: getValues('project.id'),
      teamNames: getValues('project.group'),
      productNames: getValues('project.product'),
      statuses: getValues('task.status'),
      phaseIds: getValues('metadata.toPhaseId'),
      actionType: rule.action.type,
      emailTemplateId: rule.action.emailTemplateId || '',
      recipients: (rule.action.recipients || []) as RuleFormState['recipients'],
      customEmails: (rule.action.customEmails || []).join(', '),
      notificationRecipient: rule.action.recipient || 'responsible',
      notificationTitle: rule.action.title || '',
      notificationMessage: rule.action.message || '',
      targetTaskStatus: rule.action.targetStatus || 'in_progress',
      targetProjectField: rule.action.targetField || '',
      targetProjectValue: rule.action.targetValue || '',
      taskTemplateId: rule.action.taskTemplateId || '',
    });
    setIsRuleModalOpen(true);
  };

  const closeRuleModal = () => {
    setEditingRule(null);
    setRuleForm(EMPTY_RULE_FORM);
    setIsRuleModalOpen(false);
  };

  const upsertEmailTemplate = () => {
    if (!emailTemplateForm.nome.trim() || !emailTemplateForm.assunto.trim() || !emailTemplateForm.corpo_html.trim()) {
      showFeedback({
        tone: 'error',
        title: 'Template incompleto',
        message: 'Informe nome, assunto e corpo HTML para salvar o template de e-mail.',
      });
      return;
    }

    const payload: EmailTemplate = {
      id: editingEmailTemplate?.id || `email-template-${Date.now()}`,
      nome: emailTemplateForm.nome.trim(),
      assunto: emailTemplateForm.assunto.trim(),
      corpo_html: emailTemplateForm.corpo_html.trim(),
      variaveis_disponiveis: EMAIL_VARIABLES.map((item) => item.replace(/\{|\}/g, '')),
      ativo: emailTemplateForm.ativo,
      createdAt: editingEmailTemplate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingEmailTemplate) {
      updateEmailTemplate(editingEmailTemplate.id, payload);
    } else {
      addEmailTemplate(payload);
    }

    setEditingEmailTemplate(null);
    setEmailTemplateForm(EMPTY_EMAIL_TEMPLATE_FORM);
    showFeedback({
      tone: 'success',
      title: editingEmailTemplate ? 'Template atualizado' : 'Template criado',
    });
  };

  const validateRule = () => {
    if (!ruleForm.name.trim()) return 'Informe um nome para a automação.';
    if (!ruleForm.event) return 'Selecione o gatilho da automação.';
    if (!ruleForm.actionType) return 'Selecione a ação da automação.';
    if (ruleForm.actionType === 'send_email' && !ruleForm.emailTemplateId) return 'Selecione um template de e-mail.';
    if (ruleForm.actionType === 'send_email' && ruleForm.recipients.length === 0) return 'Selecione ao menos um destinatário.';
    if (ruleForm.actionType === 'create_notification' && !ruleForm.notificationTitle.trim()) return 'Informe o título da notificação.';
    if (ruleForm.actionType === 'update_project_field' && !ruleForm.targetProjectField.trim()) return 'Informe qual campo será atualizado.';
    if (ruleForm.actionType === 'create_task_from_template' && !ruleForm.taskTemplateId) return 'Selecione o template de tarefas a aplicar.';
    return null;
  };

  const buildConditions = () => {
    const conditions = [];
    if (ruleForm.projectIds.length > 0) {
      conditions.push({ id: `condition-${Date.now()}-project`, field: 'project.id', operator: 'in' as const, value: ruleForm.projectIds.join(','), values: ruleForm.projectIds });
    }
    if (ruleForm.teamNames.length > 0) {
      conditions.push({ id: `condition-${Date.now()}-team`, field: 'project.group', operator: 'in' as const, value: ruleForm.teamNames.join(','), values: ruleForm.teamNames });
    }
    if (ruleForm.productNames.length > 0) {
      conditions.push({ id: `condition-${Date.now()}-product`, field: 'project.product', operator: 'in' as const, value: ruleForm.productNames.join(','), values: ruleForm.productNames });
    }
    if (ruleForm.statuses.length > 0) {
      conditions.push({ id: `condition-${Date.now()}-status`, field: 'task.status', operator: 'in' as const, value: ruleForm.statuses.join(','), values: ruleForm.statuses });
    }
    if (ruleForm.phaseIds.length > 0) {
      conditions.push({ id: `condition-${Date.now()}-phase`, field: 'metadata.toPhaseId', operator: 'in' as const, value: ruleForm.phaseIds.join(','), values: ruleForm.phaseIds });
    }
    return conditions;
  };

  const saveRule = () => {
    const validationError = validateRule();
    if (validationError) {
      showFeedback({
        tone: 'error',
        title: 'Regra incompleta',
        message: validationError,
      });
      return;
    }

    const duplicate = automationRules.some((rule) => {
      if (rule.id === editingRule?.id) return false;
      return (
        rule.event === ruleForm.event &&
        rule.action.type === ruleForm.actionType &&
        JSON.stringify((rule.conditions || []).map((condition) => [condition.field, condition.values || condition.value])) ===
          JSON.stringify(buildConditions().map((condition) => [condition.field, condition.values || condition.value]))
      );
    });

    if (duplicate) {
      showFeedback({
        tone: 'error',
        title: 'Regra duplicada',
        message: 'Já existe uma automação com o mesmo WHEN / IF / THEN.',
      });
      return;
    }

    const customEmails = ruleForm.customEmails
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const nextRule: AutomationRule = {
      id: editingRule?.id || `automation-${Date.now()}`,
      name: ruleForm.name.trim(),
      description: ruleForm.description.trim() || undefined,
      event: ruleForm.event,
      triggerType: ruleForm.event,
      isActive: editingRule?.isActive ?? true,
      conditions: buildConditions(),
      action:
        ruleForm.actionType === 'send_email'
          ? {
              type: 'send_email',
              emailTemplateId: ruleForm.emailTemplateId,
              recipients: ruleForm.recipients,
              customEmails,
            }
          : ruleForm.actionType === 'create_notification'
            ? {
                type: 'create_notification',
                recipient: ruleForm.notificationRecipient,
                title: ruleForm.notificationTitle.trim(),
                message: ruleForm.notificationMessage.trim(),
              }
            : ruleForm.actionType === 'update_task_status'
              ? {
                  type: 'update_task_status',
                  targetStatus: ruleForm.targetTaskStatus,
                }
              : ruleForm.actionType === 'update_project_field'
                ? {
                    type: 'update_project_field',
                    targetField: ruleForm.targetProjectField.trim(),
                    targetValue: ruleForm.targetProjectValue.trim(),
                  }
                : ruleForm.actionType === 'create_task_from_template'
                  ? {
                      type: 'create_task_from_template',
                      taskTemplateId: ruleForm.taskTemplateId,
                    }
                  : {
                      type: ruleForm.actionType,
                    },
      actions: [],
      createdAt: editingRule?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingRule) {
      updateAutomationRule(editingRule.id, nextRule);
    } else {
      addAutomationRule(nextRule);
    }

    showFeedback({
      tone: 'success',
      title: editingRule ? 'Automação atualizada' : 'Automação criada',
      message: 'A regra foi salva no formato simples de operação.',
    });
    closeRuleModal();
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Automações PMO</h2>
            <p className="mt-1 max-w-3xl text-sm text-gray-600">
              Regras configuradas em formato simples para reduzir erro humano: defina o gatilho, aplique filtros objetivos e escolha uma ação previsível.
            </p>
          </div>
          <button
            onClick={openCreateRule}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nova automação
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          {sortedRules.map((rule) => (
            <div key={rule.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {rule.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  {rule.description ? <p className="text-sm text-gray-600">{rule.description}</p> : null}
                  <RuleSentence label="Quando" value={AUTOMATION_EVENT_OPTIONS.find((item) => item.value === rule.event)?.label || rule.event} />
                  <RuleSentence
                    label="Se"
                    value={
                      (rule.conditions || []).length > 0
                        ? (rule.conditions || [])
                            .map((condition) => `${condition.field}: ${(condition.values || [condition.value]).join(', ')}`)
                            .join(' • ')
                        : 'Sem filtros adicionais'
                    }
                  />
                  <RuleSentence label="Então" value={AUTOMATION_ACTION_OPTIONS.find((item) => item.value === rule.action.type)?.label || rule.action.type} />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      toggleAutomationRule(rule.id);
                      showFeedback({
                        tone: 'success',
                        title: rule.isActive ? 'Automação inativada' : 'Automação ativada',
                      });
                    }}
                    className="rounded-lg border border-gray-200 p-2 hover:bg-white"
                    title={rule.isActive ? 'Inativar automação' : 'Ativar automação'}
                  >
                    {rule.isActive ? <PowerOff className="h-4 w-4 text-gray-600" /> : <Power className="h-4 w-4 text-green-600" />}
                  </button>
                  <button onClick={() => openEditRule(rule)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-white">
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      deleteAutomationRule(rule.id);
                      showFeedback({ tone: 'success', title: 'Automação removida' });
                    }}
                    className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {sortedRules.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              Nenhuma automação configurada.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Templates de e-mail</h2>
            <p className="mt-1 text-sm text-gray-600">
              Comunicação padronizada para automações e disparos manuais no projeto.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingEmailTemplate(null);
              setEmailTemplateForm(EMPTY_EMAIL_TEMPLATE_FORM);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            <Mail className="h-4 w-4" />
            Novo template
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          Variáveis disponíveis: {EMAIL_VARIABLES.join(', ')}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-4">
            {sortedEmailTemplates.map((template) => (
              <div key={template.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">{template.nome}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${template.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {template.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{template.assunto}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingEmailTemplate(template);
                        setEmailTemplateForm({
                          nome: template.nome,
                          assunto: template.assunto,
                          corpo_html: template.corpo_html,
                          ativo: template.ativo,
                        });
                      }}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        deleteEmailTemplate(template.id);
                        showFeedback({ tone: 'success', title: 'Template de e-mail removido' });
                      }}
                      className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900">
                {editingEmailTemplate ? 'Editar template de e-mail' : 'Cadastrar template de e-mail'}
              </h3>
            </div>
            <div className="mt-4 space-y-4">
              <Field label="Nome">
                <input
                  value={emailTemplateForm.nome}
                  onChange={(e) => setEmailTemplateForm((prev) => ({ ...prev, nome: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </Field>
              <Field label="Assunto">
                <input
                  value={emailTemplateForm.assunto}
                  onChange={(e) => setEmailTemplateForm((prev) => ({ ...prev, assunto: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </Field>
              <Field label="Corpo HTML">
                <textarea
                  value={emailTemplateForm.corpo_html}
                  onChange={(e) => setEmailTemplateForm((prev) => ({ ...prev, corpo_html: e.target.value }))}
                  className="min-h-[220px] w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={emailTemplateForm.ativo}
                  onChange={(e) => setEmailTemplateForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                />
                Template ativo
              </label>
              <div className="flex justify-end gap-3">
                {editingEmailTemplate ? (
                  <button
                    onClick={() => {
                      setEditingEmailTemplate(null);
                      setEmailTemplateForm(EMPTY_EMAIL_TEMPLATE_FORM);
                    }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-white"
                  >
                    Cancelar
                  </button>
                ) : null}
                <button onClick={upsertEmailTemplate} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                  Salvar template
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900">Execuções recentes</h3>
        <div className="mt-4 space-y-3">
          {automationExecutions.slice(0, 10).map((execution) => (
            <div key={execution.id} className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{execution.ruleName}</p>
                <p className="text-xs text-gray-500">
                  {execution.event} • {execution.summary}
                </p>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(execution.timestamp).toLocaleString('pt-BR')}
              </span>
            </div>
          ))}
          {automationExecutions.length === 0 && (
            <p className="text-sm text-gray-500">Nenhuma execução registrada ainda.</p>
          )}
        </div>
      </section>

      {isRuleModalOpen && (
        <AdminResponsiveModal
          title={editingRule ? 'Editar automação' : 'Nova automação'}
          description="Configure a regra no formato simples usado pelo PMO real: gatilho objetivo, filtros claros e ação previsível."
          onClose={closeRuleModal}
          maxWidthClassName="max-w-4xl"
          bodyClassName="space-y-6"
          footer={
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeRuleModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveRule}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Salvar automação
              </button>
            </div>
          }
        >
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome da regra">
                  <input
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </Field>
                <Field label="Descrição">
                  <input
                    value={ruleForm.description}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </Field>
              </div>

              <RuleBlock title="Quando">
                <Field label="Gatilho">
                  <select
                    value={ruleForm.event}
                    onChange={(e) => setRuleForm((prev) => ({ ...prev, event: e.target.value as AutomationRule['event'] }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    {AUTOMATION_EVENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </RuleBlock>

              <RuleBlock title="Se">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Projeto">
                    <SearchableMultiSelect
                      value={ruleForm.projectIds}
                      onChange={(value) => setRuleForm((prev) => ({ ...prev, projectIds: value }))}
                      options={projectOptions}
                      placeholder="Todos os projetos"
                      allLabel="Todos"
                      searchPlaceholder="Buscar projeto..."
                    />
                  </Field>
                  <Field label="Equipe">
                    <SearchableMultiSelect
                      value={ruleForm.teamNames}
                      onChange={(value) => setRuleForm((prev) => ({ ...prev, teamNames: value }))}
                      options={teamOptions}
                      placeholder="Todas as equipes"
                      allLabel="Todas"
                      searchPlaceholder="Buscar equipe..."
                    />
                  </Field>
                  <Field label="Produto">
                    <SearchableMultiSelect
                      value={ruleForm.productNames}
                      onChange={(value) => setRuleForm((prev) => ({ ...prev, productNames: value }))}
                      options={productOptions}
                      placeholder="Todos os produtos"
                      allLabel="Todos"
                      searchPlaceholder="Buscar produto..."
                    />
                  </Field>
                  <Field label="Status da tarefa">
                    <SearchableMultiSelect
                      value={ruleForm.statuses}
                      onChange={(value) => setRuleForm((prev) => ({ ...prev, statuses: value }))}
                      options={statusOptions}
                      placeholder="Todos os status"
                      allLabel="Todos"
                      searchPlaceholder="Buscar status..."
                    />
                  </Field>
                  <Field label="Fase do projeto">
                    <SearchableMultiSelect
                      value={ruleForm.phaseIds}
                      onChange={(value) => setRuleForm((prev) => ({ ...prev, phaseIds: value }))}
                      options={phaseOptions}
                      placeholder="Todas as fases"
                      allLabel="Todas"
                      searchPlaceholder="Buscar fase..."
                    />
                  </Field>
                </div>
              </RuleBlock>

              <RuleBlock title="Então">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Ação">
                    <select
                      value={ruleForm.actionType}
                      onChange={(e) => setRuleForm((prev) => ({ ...prev, actionType: e.target.value as RuleFormState['actionType'] }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    >
                      {AUTOMATION_ACTION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {ruleForm.actionType === 'send_email' && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Template de e-mail">
                      <select
                        value={ruleForm.emailTemplateId}
                        onChange={(e) => setRuleForm((prev) => ({ ...prev, emailTemplateId: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      >
                        <option value="">Selecione</option>
                        {emailTemplateOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Destinatários">
                      <SearchableMultiSelect
                        value={ruleForm.recipients}
                        onChange={(value) => setRuleForm((prev) => ({ ...prev, recipients: value as RuleFormState['recipients'] }))}
                        options={[
                          { value: 'stakeholders', label: 'Stakeholders' },
                          { value: 'responsible', label: 'Responsável' },
                          { value: 'requester', label: 'Solicitante' },
                          { value: 'current_user', label: 'Usuário atual' },
                          { value: 'admins_and_pmo', label: 'Admins e PMO' },
                          { value: 'custom', label: 'E-mails customizados' },
                        ]}
                        placeholder="Selecionar destinatários"
                        allLabel="Todos"
                        searchPlaceholder="Buscar destino..."
                      />
                    </Field>
                    <Field label="E-mails customizados" className="md:col-span-2">
                      <input
                        value={ruleForm.customEmails}
                        onChange={(e) => setRuleForm((prev) => ({ ...prev, customEmails: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        placeholder="email1@empresa.com, email2@empresa.com"
                      />
                    </Field>
                  </div>
                )}

                {ruleForm.actionType === 'create_notification' && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Destinatário">
                      <select
                        value={ruleForm.notificationRecipient}
                        onChange={(e) => setRuleForm((prev) => ({ ...prev, notificationRecipient: e.target.value as RuleFormState['notificationRecipient'] }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      >
                        <option value="responsible">Responsável do projeto</option>
                        <option value="requester">Solicitante</option>
                        <option value="current_user">Usuário atual</option>
                        <option value="admins_and_pmo">Admins e PMO</option>
                      </select>
                    </Field>
                    <Field label="Título">
                      <input
                        value={ruleForm.notificationTitle}
                        onChange={(e) => setRuleForm((prev) => ({ ...prev, notificationTitle: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </Field>
                    <Field label="Mensagem" className="md:col-span-2">
                      <textarea
                        value={ruleForm.notificationMessage}
                        onChange={(e) => setRuleForm((prev) => ({ ...prev, notificationMessage: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        rows={2}
                      />
                    </Field>
                  </div>
                )}

                {ruleForm.actionType === 'update_task_status' && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Status de destino">
                      <select
                        value={ruleForm.targetTaskStatus}
                        onChange={(e) => setRuleForm((prev) => ({ ...prev, targetTaskStatus: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}

                {ruleForm.actionType === 'update_project_field' && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Campo do projeto">
                      <select
                        value={ruleForm.targetProjectField}
                        onChange={(e) => setRuleForm((prev) => ({ ...prev, targetProjectField: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      >
                        <option value="">Selecione</option>
                        <option value="weeklyUpdate">Atualização semanal</option>
                        <option value="documentation">Link de documentação</option>
                        <option value="originTicket">Ticket de origem</option>
                      </select>
                    </Field>
                    <Field label="Novo valor">
                      <input
                        value={ruleForm.targetProjectValue}
                        onChange={(e) => setRuleForm((prev) => ({ ...prev, targetProjectValue: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </Field>
                  </div>
                )}

                {ruleForm.actionType === 'create_task_from_template' && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Template de tarefas">
                      <select
                        value={ruleForm.taskTemplateId}
                        onChange={(e) => setRuleForm((prev) => ({ ...prev, taskTemplateId: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      >
                        <option value="">Selecione</option>
                        {taskTemplateOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}
              </RuleBlock>
            </div>
        </AdminResponsiveModal>
      )}
    </div>
  );
}

function RuleSentence({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function RuleBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">{title}</p>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
