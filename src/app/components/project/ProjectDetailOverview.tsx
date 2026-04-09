import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  FileText,
  Link2,
  Mail,
  Paperclip,
  Plus,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { Project, ProjectAttachment, Stakeholder, User } from '../../types';
import { PROJECT_PURPOSES_LABELS } from '../../constants/project';
import { getProjectRequester } from '../../utils/projectSelectors';
import { buildAttachmentFromFile } from '../shared/AttachmentUploader';
import { useAdmin } from '../../context/AdminContext';
import {
  createProjectCommunicationMessage,
  isValidEmailAddress,
  normalizeEmailAddress,
} from '../../utils/email';
import { useFeedback } from '../../context/FeedbackContext';

interface ProjectDetailOverviewProps {
  project: Project;
  canAddAttachments: boolean;
  canRemoveAttachments: boolean;
  onAddAttachments: (attachments: ProjectAttachment[]) => void;
  onRemoveAttachment: (attachmentId: string) => void;
}

type RecipientSource = 'responsible' | 'requester' | 'stakeholder' | 'project-user' | 'manual';

interface RecipientOption {
  id: string;
  email: string;
  label: string;
  description?: string;
  source: RecipientSource;
  originType: 'project' | 'manual';
  defaultSelected: boolean;
}

const RECIPIENT_SOURCE_LABELS: Record<RecipientSource, string> = {
  responsible: 'Responsável',
  requester: 'Solicitante',
  stakeholder: 'Stakeholder',
  'project-user': 'Usuário do projeto',
  manual: 'Manual',
};

export function ProjectDetailOverview({
  project,
  canAddAttachments,
  canRemoveAttachments,
  onAddAttachments,
  onRemoveAttachment,
}: ProjectDetailOverviewProps) {
  const { users, stakeholders, emailTemplates, sendEmailMessage, currentUser } = useAdmin();
  const { showFeedback } = useFeedback();
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState('');
  const [manualRecipientInput, setManualRecipientInput] = useState('');
  const [manualRecipients, setManualRecipients] = useState<RecipientOption[]>([]);
  const [enabledSuggestionIds, setEnabledSuggestionIds] = useState<string[]>([]);
  const [recipientInputError, setRecipientInputError] = useState('');

  const handleAttachmentSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    try {
      const attachments = await Promise.all(files.map(buildAttachmentFromFile));
      onAddAttachments(attachments);
    } finally {
      event.target.value = '';
    }
  };

  const getUserLabel = (name?: string) => {
    if (!name) return 'Nao informado';
    const user = users.find((item) => item.name === name);
    return user?.cargo ? `${name} • ${user.cargo}` : name;
  };

  const activeEmailTemplates = useMemo(
    () => emailTemplates.filter((template) => template.ativo),
    [emailTemplates]
  );
  const selectedEmailTemplate = useMemo(
    () => activeEmailTemplates.find((template) => template.id === selectedEmailTemplateId) || null,
    [activeEmailTemplates, selectedEmailTemplateId]
  );

  const projectRecipientSuggestions = useMemo(
    () => buildProjectRecipientSuggestions(project, users, stakeholders),
    [project, stakeholders, users]
  );

  useEffect(() => {
    setEnabledSuggestionIds((current) => {
      const currentSet = new Set(current);
      return projectRecipientSuggestions
        .filter((option) => option.defaultSelected || currentSet.has(option.id))
        .map((option) => option.id);
    });
  }, [projectRecipientSuggestions]);

  const enabledSuggestions = useMemo(() => {
    const enabledSet = new Set(enabledSuggestionIds);
    return projectRecipientSuggestions.filter((option) => enabledSet.has(option.id));
  }, [enabledSuggestionIds, projectRecipientSuggestions]);

  const previewRecipients = useMemo(
    () =>
      [...enabledSuggestions, ...manualRecipients].sort((left, right) =>
        left.label.localeCompare(right.label, 'pt-BR')
      ),
    [enabledSuggestions, manualRecipients]
  );

  const previewMessage = useMemo(
    () =>
      selectedEmailTemplate
        ? createProjectCommunicationMessage({
            to: previewRecipients.map((recipient) => recipient.email),
            project,
            template: selectedEmailTemplate,
            initiatedBy: currentUser?.name || 'PMO',
          })
        : null,
    [currentUser?.name, previewRecipients, project, selectedEmailTemplate]
  );

  const knownEmails = useMemo(() => {
    const emails = new Set<string>();
    projectRecipientSuggestions.forEach((option) => emails.add(normalizeEmailAddress(option.email)));
    manualRecipients.forEach((option) => emails.add(normalizeEmailAddress(option.email)));
    return emails;
  }, [manualRecipients, projectRecipientSuggestions]);

  const toggleSuggestedRecipient = (optionId: string) => {
    setEnabledSuggestionIds((current) =>
      current.includes(optionId)
        ? current.filter((item) => item !== optionId)
        : [...current, optionId]
    );
  };

  const addManualRecipient = () => {
    const normalized = normalizeEmailAddress(manualRecipientInput);
    if (!normalized) return;

    if (!isValidEmailAddress(normalized)) {
      setRecipientInputError('Informe um e-mail válido antes de adicionar.');
      return;
    }

    if (knownEmails.has(normalized)) {
      setRecipientInputError('Este e-mail já está disponível na composição atual.');
      return;
    }

    setManualRecipients((current) => [
      ...current,
      {
        id: `manual-${normalized}`,
        email: normalized,
        label: normalized,
        description: 'Adicionado manualmente',
        source: 'manual',
        originType: 'manual',
        defaultSelected: true,
      },
    ]);
    setManualRecipientInput('');
    setRecipientInputError('');
  };

  const removeRecipient = (recipient: RecipientOption) => {
    if (recipient.originType === 'manual') {
      setManualRecipients((current) => current.filter((item) => item.id !== recipient.id));
      return;
    }

    setEnabledSuggestionIds((current) => current.filter((item) => item !== recipient.id));
  };

  const handleManualRecipientKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
      event.preventDefault();
      addManualRecipient();
    }
  };

  const handleSendCommunication = () => {
    if (!selectedEmailTemplate || previewRecipients.length === 0) return;

    const queuedMessage = createProjectCommunicationMessage({
      to: previewRecipients.map((recipient) => recipient.email),
      project,
      template: selectedEmailTemplate,
      initiatedBy: currentUser?.name || 'PMO',
    });
    sendEmailMessage(queuedMessage);

    setManualRecipients([]);
    setManualRecipientInput('');
    setRecipientInputError('');
    setSelectedEmailTemplateId('');
    setEnabledSuggestionIds(
      projectRecipientSuggestions.filter((option) => option.defaultSelected).map((option) => option.id)
    );
    showFeedback({
      tone: 'success',
      title: 'Comunicação enviada para a fila',
      message: `Mensagem preparada para ${previewRecipients.length} destinatário(s).`,
    });
  };

  const availableSuggestionCount = projectRecipientSuggestions.length;
  const selectedProjectRecipientCount = enabledSuggestions.length;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
      <div className="space-y-6">
        <SectionCard title="Dados e Documentacao">
          <KeyValueGrid
            items={[
              { label: 'Ticket de origem', value: project.originTicket || 'Nao informado' },
              {
                label: 'Finalidade',
                value: project.purpose
                  ? PROJECT_PURPOSES_LABELS[project.purpose] || project.purpose
                  : 'Nao informada',
              },
              { label: 'Produto', value: project.product || 'Nao informado' },
              { label: 'Documentacao', value: project.documentation || 'Nao informada', isLink: true },
            ]}
          />

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-gray-400" />
                <h4 className="text-sm font-medium text-gray-700">Anexos</h4>
              </div>
              {canAddAttachments && (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                  <Plus className="h-4 w-4" />
                  Adicionar anexo
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.zip,.rar"
                    onChange={handleAttachmentSelection}
                  />
                </label>
              )}
            </div>
            {project.attachments && project.attachments.length > 0 ? (
              <div className="space-y-2">
                {project.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Link2 className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{attachment.name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {new Date(attachment.uploadedAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={attachment.url}
                        download={attachment.name}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                        title="Abrir ou baixar anexo"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      {canRemoveAttachments && (
                        <button
                          type="button"
                          onClick={() => onRemoveAttachment(attachment.id)}
                          className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                          title="Remover anexo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5">
                <p className="text-sm text-gray-600">Nenhum anexo cadastrado no projeto ainda.</p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Comunicação">
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Template</span>
                <select
                  value={selectedEmailTemplateId}
                  onChange={(event) => setSelectedEmailTemplateId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">Selecione</option>
                  {activeEmailTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.nome}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Composição de destinatários</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedProjectRecipientCount} selecionado(s) do projeto • {manualRecipients.length} manual(is)
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {availableSuggestionCount} sugestão(ões)
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-semibold text-slate-900">Sugestões do projeto</p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {projectRecipientSuggestions.length > 0 ? (
                  projectRecipientSuggestions.map((option) => {
                    const isSelected = enabledSuggestionIds.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleSuggestedRecipient(option.id)}
                        className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{option.label}</p>
                            <p className="mt-1 truncate text-xs text-slate-500">{option.email}</p>
                            {option.description ? (
                              <p className="mt-2 text-xs text-slate-500">{option.description}</p>
                            ) : null}
                          </div>
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-slate-300 bg-white text-transparent'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <SourceBadge source={option.source} originType={option.originType} />
                          {option.defaultSelected ? (
                            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                              Auto incluído
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                              Opcional
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500 md:col-span-2">
                    Nenhum e-mail relacionado ao projeto foi encontrado nos cadastros atuais.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-semibold text-slate-900">Adicionar destinatário manual</p>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={manualRecipientInput}
                  onChange={(event) => {
                    setManualRecipientInput(event.target.value);
                    if (recipientInputError) setRecipientInputError('');
                  }}
                  onKeyDown={handleManualRecipientKeyDown}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="nome@empresa.com"
                />
                <button
                  type="button"
                  onClick={addManualRecipient}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </button>
              </div>
              {recipientInputError ? (
                <p className="mt-2 text-sm text-rose-600">{recipientInputError}</p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Use `Enter`, vírgula ou ponto e vírgula para adicionar. O sistema bloqueia e-mails inválidos e duplicados.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-900">Prévia operacional</p>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Destinatários</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewRecipients.length > 0 ? (
                    previewRecipients.map((recipient) => (
                      <RecipientChip
                        key={recipient.id}
                        recipient={recipient}
                        onRemove={() => removeRecipient(recipient)}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      Selecione destinatários do projeto ou adicione um e-mail manual.
                    </p>
                  )}
                </div>
              </div>

              <p className="mt-4 text-sm text-gray-700">
                <strong>Assunto:</strong> {previewMessage?.subject || 'Selecione um template'}
              </p>

              <div className="mt-3 rounded-lg bg-white p-3 text-sm text-gray-700">
                {selectedEmailTemplate ? (
                  <div dangerouslySetInnerHTML={{ __html: previewMessage?.htmlBody || '' }} />
                ) : (
                  <p>Selecione um template para visualizar o conteúdo.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSendCommunication}
                disabled={!selectedEmailTemplate || previewRecipients.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
                Enviar comunicação
              </button>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="space-y-6">
        <SectionCard title="Relacionamentos">
          <TagList
            title="Equipes envolvidas"
            icon={<Users className="h-4 w-4 text-gray-400" />}
            values={project.teams || []}
            empty="Nenhuma equipe vinculada."
          />
          <StakeholderList
            title="Stakeholders"
            icon={<Users className="h-4 w-4 text-gray-400" />}
            assignments={project.stakeholderAssignments || []}
            legacyValues={project.stakeholders || []}
            stakeholdersCatalog={stakeholders}
            empty="Nenhum stakeholder vinculado."
          />
        </SectionCard>

        <SectionCard title="Resumo Operacional">
          <KeyValueGrid
            items={[
              { label: 'Equipe principal', value: project.group || 'Nao informada' },
              { label: 'Responsavel', value: getUserLabel(project.responsible) },
              { label: 'Solicitante', value: getUserLabel(getProjectRequester(project)) },
              { label: 'Cliente', value: project.client || 'Nao informado' },
            ]}
          />
        </SectionCard>
      </div>
    </div>
  );
}

function buildProjectRecipientSuggestions(
  project: Project,
  users: User[],
  stakeholders: Stakeholder[]
): RecipientOption[] {
  const suggestions = new Map<string, RecipientOption>();
  const projectStakeholderIds = new Set((project.stakeholderAssignments || []).map((assignment) => assignment.stakeholderId));
  const relatedTeamNames = new Set([project.group, ...(project.teams || [])].filter(Boolean));

  const addSuggestion = (option: RecipientOption | null) => {
    if (!option) return;
    const normalizedEmail = normalizeEmailAddress(option.email);
    if (!normalizedEmail || !isValidEmailAddress(normalizedEmail)) return;
    const existing = suggestions.get(normalizedEmail);

    if (!existing) {
      suggestions.set(normalizedEmail, { ...option, email: normalizedEmail });
      return;
    }

    suggestions.set(normalizedEmail, {
      ...existing,
      defaultSelected: existing.defaultSelected || option.defaultSelected,
      description: existing.description || option.description,
    });
  };

  const responsibleUser = users.find((user) => user.name === project.responsible);
  addSuggestion(
    responsibleUser?.email
      ? {
          id: `responsible-${responsibleUser.id}`,
          email: responsibleUser.email,
          label: responsibleUser.name,
          description: responsibleUser.cargo || 'Responsável do projeto',
          source: 'responsible',
          originType: 'project',
          defaultSelected: true,
        }
      : null
  );

  const requesterName = getProjectRequester(project);
  const requesterUser = users.find((user) => user.name === requesterName);
  addSuggestion(
    requesterUser?.email
      ? {
          id: `requester-${requesterUser.id}`,
          email: requesterUser.email,
          label: requesterUser.name,
          description: requesterUser.cargo || 'Solicitante do projeto',
          source: 'requester',
          originType: 'project',
          defaultSelected: true,
        }
      : null
  );

  (project.stakeholderAssignments || []).forEach((assignment) => {
    const stakeholder =
      stakeholders.find((item) => item.id === assignment.stakeholderId) ||
      stakeholders.find((item) => item.name === assignment.name);
    addSuggestion(
      stakeholder?.email
        ? {
            id: `stakeholder-${stakeholder.id}`,
            email: stakeholder.email,
            label: assignment.name,
            description: assignment.projectRole || stakeholder.role || 'Stakeholder do projeto',
            source: 'stakeholder',
            originType: 'project',
            defaultSelected: true,
          }
        : null
    );
  });

  (project.projectRoleAssignments || []).forEach((assignment) => {
    const user = users.find((item) => item.id === assignment.userId);
    addSuggestion(
      user?.email
        ? {
            id: `project-role-${assignment.id}`,
            email: user.email,
            label: assignment.userName || user.name,
            description: assignment.roleLabel,
            source: 'project-user',
            originType: 'project',
            defaultSelected: true,
          }
        : null
    );
  });

  users
    .filter((user) => {
      if (!user.email) return false;
      if (responsibleUser?.id === user.id || requesterUser?.id === user.id) return false;
      if ((project.projectRoleAssignments || []).some((assignment) => assignment.userId === user.id)) return false;
      if (projectStakeholderIds.has(user.id)) return false;
      return relatedTeamNames.has(user.team) || (user.teams || []).some((team) => relatedTeamNames.has(team));
    })
    .forEach((user) =>
      addSuggestion({
        id: `team-user-${user.id}`,
        email: user.email,
        label: user.name,
        description: user.cargo || user.team || 'Usuário relacionado ao projeto',
        source: 'project-user',
        originType: 'project',
        defaultSelected: false,
      })
    );

  return Array.from(suggestions.values()).sort((left, right) =>
    left.label.localeCompare(right.label, 'pt-BR')
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function SourceBadge({
  source,
  originType,
}: {
  source: RecipientSource;
  originType: 'project' | 'manual';
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
        originType === 'manual'
          ? 'bg-violet-50 text-violet-700'
          : 'bg-slate-100 text-slate-700'
      }`}
    >
      {RECIPIENT_SOURCE_LABELS[source]}
    </span>
  );
}

function RecipientChip({
  recipient,
  onRemove,
}: {
  recipient: RecipientOption;
  onRemove: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
      <span className="max-w-[220px] truncate font-medium" title={`${recipient.label} <${recipient.email}>`}>
        {recipient.label}
      </span>
      <SourceBadge source={recipient.source} originType={recipient.originType} />
      <span className="max-w-[220px] truncate text-slate-500">{recipient.email}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        title="Remover destinatário"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function KeyValueGrid({
  items,
}: {
  items: Array<{ label: string; value: string; isLink?: boolean }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">{item.label}</p>
          {item.isLink && item.value !== 'Nao informada' ? (
            <a
              href={item.value}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block break-all text-sm font-medium text-blue-700 hover:underline"
            >
              {item.value}
            </a>
          ) : (
            <p className="mt-1 break-words text-sm font-medium text-gray-900">{item.value}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function TagList({
  title,
  values,
  empty,
  icon,
}: {
  title: string;
  values: string[];
  empty: string;
  icon: ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      </div>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
            >
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">{empty}</p>
      )}
    </div>
  );
}

function StakeholderList({
  title,
  assignments,
  legacyValues,
  stakeholdersCatalog,
  empty,
  icon,
}: {
  title: string;
  assignments: Project['stakeholderAssignments'];
  legacyValues: string[];
  stakeholdersCatalog: Array<{ id: string; name: string; role: string }>;
  empty: string;
  icon: ReactNode;
}) {
  const normalizedAssignments =
    assignments && assignments.length > 0
      ? assignments
      : legacyValues.map((value) => ({
          stakeholderId: `legacy-${value}`,
          name: value,
          projectRole: undefined,
        }));

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      </div>
      {normalizedAssignments.length > 0 ? (
        <div className="space-y-2">
          {normalizedAssignments.map((assignment) => {
            const catalogStakeholder = stakeholdersCatalog.find(
              (item) =>
                item.id === assignment.stakeholderId || item.name === assignment.name
            );

            return (
              <div
                key={assignment.stakeholderId}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
              >
                <p className="text-sm font-medium text-gray-900">{assignment.name}</p>
                {catalogStakeholder?.role && (
                  <p className="mt-1 text-xs text-gray-600">{catalogStakeholder.role}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {assignment.projectRole || 'Papel nao informado'}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">{empty}</p>
      )}
    </div>
  );
}
