import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { ImagePlus, Link2, Trash2, X } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useEAP } from '../context/EAPContext';
import { Project, ProjectAttachment } from '../types';
import { PROJECT_SITUATIONS_OPTIONS } from '../constants/project';
import { SearchableMultiSelect } from './filters/SearchableMultiSelect';
import { ProjectRoleAssignmentSelector } from './filters/ProjectRoleAssignmentSelector';
import { StakeholderRoleSelector } from './filters/StakeholderRoleSelector';
import { TagSelector } from './filters/TagSelector';
import { AttachmentUploader } from './shared/AttachmentUploader';
import {
  buildProjectFromFormValues,
  mapProjectToFormValues,
  ProjectFormValues,
} from '../utils/projectForm';
import { getProjectExecutionPhases } from '../utils/projectSelectors';
import { canUserPerform } from '../utils/permissions';
import { useFeedback } from '../context/FeedbackContext';
import { applyRoleAssignmentsToPhases } from '../utils/phaseOwnership';

const INPUT_CLASS =
  'w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus:outline-none focus:ring-2 focus:ring-blue-500/30';

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}`));
    reader.readAsDataURL(file);
  });

interface ProjectModalProps {
  project?: Project;
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  initialValues?: Partial<ProjectFormValues>;
}

export function ProjectModal({ project, isOpen, onClose, onSave, initialValues }: ProjectModalProps) {
  const {
    teams,
    clients,
    stakeholders,
    products,
    skills,
    projectPurposes,
    users,
    currentUser,
    tags,
    ensureTag,
  } = useAdmin();
  const { eapTemplates } = useEAP();
  const { showFeedback } = useFeedback();
  const [formValues, setFormValues] = useState<ProjectFormValues>(() =>
    mapProjectToFormValues(project, stakeholders, tags)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (project?.tags || []).forEach((tagName) => {
      ensureTag(tagName, 'project', project?.group);
    });
    const baseValues = mapProjectToFormValues(project, stakeholders, tags);
    setFormValues({
      ...baseValues,
      ...initialValues,
    });
  }, [project, isOpen, stakeholders, tags, ensureTag, initialValues]);

  const filteredResponsibles = useMemo(() => {
    if (!formValues.primaryTeam) return users;
    return users.filter((user) => user.team === formValues.primaryTeam);
  }, [users, formValues.primaryTeam]);

  const purposeOptions = useMemo(
    () =>
      [...projectPurposes]
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .map((purpose) => ({
          value: purpose.value,
          label: purpose.name,
        })),
    [projectPurposes]
  );
  const teamOptions = useMemo(
    () =>
      teams
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .map((team) => ({
          value: team.name,
          label: team.name,
        })),
    [teams]
  );
  const stakeholderOptions = useMemo(
    () =>
      stakeholders
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .map((stakeholder) => ({
          value: stakeholder.id,
          label: stakeholder.name,
        })),
    [stakeholders]
  );
  const userRoleOptions = useMemo(
    () =>
      users
        .filter((user) => user.status === 'active')
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .map((user) => ({
          value: user.id,
          label: user.name,
        })),
    [users]
  );
  const selectedTemplate = useMemo(
    () => eapTemplates.find((template) => template.id === formValues.eapTemplateId),
    [eapTemplates, formValues.eapTemplateId]
  );
  const phaseOwnershipPreview = useMemo(
    () =>
      selectedTemplate
        ? applyRoleAssignmentsToPhases(selectedTemplate.phases, formValues.projectRoleAssignments)
        : [],
    [selectedTemplate, formValues.projectRoleAssignments]
  );

  const canChangeTemplate =
    !project || getProjectExecutionPhases(project).length === 0;
  const canManageProject = canUserPerform(
    currentUser,
    project ? 'project:edit' : 'project:create'
  );

  if (!isOpen) return null;

  const updateField = <K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K]
  ) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const addAttachments = async (attachments: ProjectAttachment[]) => {
    updateField('attachments', [...formValues.attachments, ...attachments]);
    showFeedback({
      tone: 'success',
      title: 'Anexos adicionados',
      message: `${attachments.length} anexo(s) adicionado(s) ao projeto.`,
    });
  };

  const removeAttachment = (attachmentId: string) => {
    updateField(
      'attachments',
      formValues.attachments.filter((attachment) => attachment.id !== attachmentId)
    );
  };

  const handleCoverFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateField('coverImage', dataUrl);
      showFeedback({
        tone: 'success',
        title: 'Capa atualizada',
        message: `A imagem "${file.name}" foi definida como capa do projeto.`,
      });
    } catch (error) {
      showFeedback({
        tone: 'error',
        title: 'Falha ao carregar capa',
        message: error instanceof Error ? error.message : 'Nao foi possivel processar a imagem selecionada.',
      });
    } finally {
      event.target.value = '';
    }
  };

  const removeCoverImage = () => {
    updateField('coverImage', '');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageProject) {
      showFeedback({
        tone: 'error',
        title: 'Ação bloqueada',
        message: 'Seu perfil atual não pode alterar a estrutura do projeto.',
      });
      return;
    }

    setIsSubmitting(true);
    const nextProject = buildProjectFromFormValues({
      form: formValues,
      existingProject: project,
      eapTemplates,
      teamsCatalog: teams,
      skillsCatalog: skills,
      tagsCatalog: tags,
    });

    onSave(nextProject);
    showFeedback({
      tone: 'success',
      title: project ? 'Projeto atualizado' : 'Projeto criado',
      message: project
        ? 'As alterações do projeto foram salvas com sucesso.'
        : 'O projeto foi criado e já está disponível nas demais visões.',
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[32px] border border-white/70 bg-[#f8fafc]/95 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between border-b border-slate-200/70 p-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {project ? 'Editar Projeto' : 'Criar Projeto'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Cadastro base unificado de projeto com governanca, execucao e persistencia.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white/90 p-2 transition-colors hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {!canManageProject && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Seu perfil atual pode visualizar este cadastro, mas não pode alterar a estrutura do projeto.
            </div>
          )}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Contexto Geral</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Situacao">
                <select
                  value={formValues.situation}
                  onChange={(e) => updateField('situation', e.target.value as ProjectFormValues['situation'])}
                  disabled={!canManageProject}
                  className={INPUT_CLASS}
                >
                  {PROJECT_SITUATIONS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Finalidade">
                <select
                  value={formValues.purpose}
                  onChange={(e) => updateField('purpose', e.target.value as ProjectFormValues['purpose'])}
                  disabled={!canManageProject}
                  className={INPUT_CLASS}
                >
                  <option value="">Selecione</option>
                  {purposeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Template de fases (EAP)">
                <select
                  value={formValues.eapTemplateId}
                  onChange={(e) => updateField('eapTemplateId', e.target.value)}
                  disabled={!canManageProject || !canChangeTemplate}
                  className={`${INPUT_CLASS} disabled:bg-gray-100 disabled:text-gray-500`}
                >
                  <option value="">Sem EAP</option>
                  {eapTemplates
                    .filter((template) => template.isActive)
                    .map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  EAP é o modelo base de fases e marcos do projeto. Escolha um template para já iniciar a execução com a estrutura esperada.
                </p>
                {!canChangeTemplate && (
                  <p className="text-xs text-gray-500 mt-1">
                    A estrutura já foi aplicada a este projeto. Para preservar o histórico, o template não é reprocessado durante a edição.
                  </p>
                )}
              </Field>

              <Field label="Titulo do Projeto" className="md:col-span-2">
                <input
                  type="text"
                  required
                  value={formValues.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  disabled={!canManageProject}
                  className={INPUT_CLASS}
                  placeholder="Ex: Novo portal comercial"
                />
              </Field>

              <Field label="Ticket de Origem">
                <input
                  type="text"
                  value={formValues.originTicket}
                  onChange={(e) => updateField('originTicket', e.target.value)}
                  disabled={!canManageProject}
                  className={INPUT_CLASS}
                  placeholder="Ex: OPT-2700"
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Relacionamentos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Equipe Principal / Workspace">
                <select
                  value={formValues.primaryTeam}
                  onChange={(e) => {
                    updateField('primaryTeam', e.target.value);
                    if (!formValues.teams.includes(e.target.value) && e.target.value) {
                      updateField('teams', [...formValues.teams, e.target.value]);
                    }
                  }}
                  disabled={!canManageProject}
                  className={INPUT_CLASS}
                  required
                >
                  <option value="">Selecione</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.name}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Cliente">
                <select
                  value={formValues.client}
                  onChange={(e) => updateField('client', e.target.value)}
                  disabled={!canManageProject}
                  className={INPUT_CLASS}
                  required
                >
                  <option value="">Selecione</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.name}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Responsavel pelo Projeto">
                <select
                  value={formValues.responsible}
                  onChange={(e) => updateField('responsible', e.target.value)}
                  disabled={!canManageProject}
                  className={INPUT_CLASS}
                  required
                >
                  <option value="">Selecione</option>
                  {filteredResponsibles.map((user) => (
                    <option key={user.id} value={user.name}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Solicitante">
                <select
                  value={formValues.requestedBy}
                  onChange={(e) => updateField('requestedBy', e.target.value)}
                  disabled={!canManageProject}
                  className={INPUT_CLASS}
                >
                  <option value="">Selecione</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.name}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Produto">
                <select
                  value={formValues.product}
                  onChange={(e) => updateField('product', e.target.value)}
                  disabled={!canManageProject}
                  className={INPUT_CLASS}
                >
                  <option value="">Selecione</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.name}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Habilidade vinculada">
                <select
                  value={formValues.skillId}
                  onChange={(e) => updateField('skillId', e.target.value)}
                  disabled={!canManageProject}
                  className={INPUT_CLASS}
                >
                  <option value="">Sem habilidade</option>
                  {skills
                    .filter((skill) => skill.status !== 'archived')
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                    .map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name}
                      </option>
                    ))}
                </select>
              </Field>

              <div className="md:col-span-2 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Equipes envolvidas</h4>
                    <p className="mt-1 text-xs text-gray-500">
                      Pesquise e selecione as equipes que participam do projeto.
                    </p>
                  </div>
                  <SearchableMultiSelect
                    value={formValues.teams}
                    options={teamOptions}
                    onChange={(value) => updateField('teams', value)}
                    placeholder="Selecionar equipes"
                    allLabel="Todas"
                    searchPlaceholder="Buscar equipe..."
                    emptyMessage="Nenhuma equipe encontrada."
                    disabled={!canManageProject}
                  />
                </div>
                <ProjectRoleAssignmentSelector
                  value={formValues.projectRoleAssignments}
                  options={userRoleOptions}
                  disabled={!canManageProject}
                  onChange={(value) => updateField('projectRoleAssignments', value)}
                />
              </div>
              <div className="md:col-span-3 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <StakeholderRoleSelector
                  value={formValues.stakeholderAssignments}
                  options={stakeholderOptions}
                  disabled={!canManageProject}
                  onChange={(value) => updateField('stakeholderAssignments', value)}
                />
                <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Prévia de responsáveis por fase</h4>
                    <p className="mt-1 text-xs text-gray-500">
                      O template define o papel esperado em cada fase. Aqui você informa quem assume cada função no projeto real.
                    </p>
                  </div>

                  {phaseOwnershipPreview.length > 0 ? (
                    <div className="space-y-3">
                      {phaseOwnershipPreview.map((phase) => (
                        <div
                          key={phase.id}
                          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{phase.name}</p>
                            {phase.expectedRoleLabel ? (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                {phase.expectedRoleLabel}
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                Papel não definido
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-gray-600">
                            {phase.suggestedOwnerName
                              ? `Responsável sugerido: ${phase.suggestedOwnerName}`
                              : 'Responsável não definido automaticamente'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                      Selecione um template de fases para visualizar os papéis esperados e montar a execução inicial.
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-3 rounded-xl border border-gray-200 p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Tags do projeto</h4>
                  <p className="mt-1 text-xs text-gray-500">
                    Adicione tags livres, reutilize tags existentes e priorize suas favoritas para uso recorrente.
                  </p>
                </div>
                <TagSelector
                  value={formValues.tagIds}
                  onChange={(value) => updateField('tagIds', value)}
                  scope="project"
                  placeholder="Buscar ou criar tags do projeto"
                  emptyMessage="Nenhuma tag disponível para projeto."
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Contexto Estrategico</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Objetivo" className="md:col-span-2">
                <textarea
                  value={formValues.objective}
                  onChange={(e) => updateField('objective', e.target.value)}
                  disabled={!canManageProject}
                  className={`${INPUT_CLASS} min-h-24`}
                />
              </Field>

              <Field label="Justificativa" className="md:col-span-2">
                <textarea
                  value={formValues.justification}
                  onChange={(e) => updateField('justification', e.target.value)}
                  disabled={!canManageProject}
                  className={`${INPUT_CLASS} min-h-24`}
                />
              </Field>

              <Field label="Beneficios Esperados" className="md:col-span-2">
                <textarea
                  value={formValues.expectedBenefitsText}
                  onChange={(e) => updateField('expectedBenefitsText', e.target.value)}
                  disabled={!canManageProject}
                  className={`${INPUT_CLASS} min-h-24`}
                  placeholder="Um beneficio por linha"
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Datas e Documentacao</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Data da Solicitacao">
                <input
                  type="date"
                  value={formValues.requestDate}
                  onChange={(e) => updateField('requestDate', e.target.value)}
                  disabled={!canManageProject}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Data Prevista de Entrega">
                <input
                  type="date"
                  value={formValues.deadline}
                  onChange={(e) => updateField('deadline', e.target.value)}
                  disabled={!canManageProject}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Data de Conclusao">
                <input
                  type="date"
                  value={formValues.completionDate}
                  onChange={(e) => updateField('completionDate', e.target.value)}
                  disabled={!canManageProject}
                  className={INPUT_CLASS}
                />
              </Field>

              <Field label="Documentacao" className="md:col-span-3">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={formValues.documentation}
                    onChange={(e) => updateField('documentation', e.target.value)}
                    disabled={!canManageProject}
                    className={INPUT_CLASS}
                    placeholder="https://..."
                  />
                </div>
              </Field>

              <div className="md:col-span-3 rounded-[24px] border border-slate-200 bg-white/80 p-4 space-y-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Capa do Projeto</h4>
                  <p className="mt-1 text-xs text-gray-500">
                    Proporcao recomendada: 1298 x 195 px. A capa sera exibida no card com recorte central e sem distorcao.
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  {formValues.coverImage ? (
                    <img
                      src={formValues.coverImage}
                      alt={`Preview da capa de ${formValues.name || 'projeto'}`}
                      className="h-[120px] w-full object-cover object-center"
                    />
                  ) : (
                    <div className="flex h-[120px] w-full items-center justify-center bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 text-sm text-gray-500">
                      Nenhuma capa definida
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <Field label="URL da capa">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        value={formValues.coverImage}
                        onChange={(e) => updateField('coverImage', e.target.value)}
                        disabled={!canManageProject}
                        className={INPUT_CLASS}
                        placeholder="https://... ou upload abaixo"
                      />
                    </div>
                  </Field>

                  <Field label="Upload de imagem">
                    <label
                      className={`flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-3 text-sm font-medium text-slate-600 transition-colors ${
                        canManageProject ? 'hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700' : 'cursor-not-allowed opacity-50'
                      }`}
                    >
                      <ImagePlus className="w-4 h-4" />
                      Selecionar imagem
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverFileChange}
                        disabled={!canManageProject}
                        className="hidden"
                      />
                    </label>
                  </Field>
                </div>

                {formValues.coverImage && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={removeCoverImage}
                      disabled={!canManageProject}
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remover capa
                    </button>
                  </div>
                )}
              </div>

              <div className="md:col-span-3">
                <AttachmentUploader
                  attachments={formValues.attachments}
                  onAddAttachments={addAttachments}
                  onRemove={removeAttachment}
                  disabled={!canManageProject}
                  title="Anexos"
                  description="Anexe PDFs, imagens, planilhas e documentos reais ao projeto."
                  emptyMessage="Nenhum anexo informado."
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canManageProject || isSubmitting}
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : project ? 'Salvar Alteracoes' : 'Criar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
