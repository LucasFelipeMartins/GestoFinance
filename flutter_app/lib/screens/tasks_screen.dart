import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../data/remote/api_client.dart';
import '../data/repositories/task_repository.dart';
import '../models/enums.dart';
import '../models/models.dart';
import '../state/providers.dart';
import '../theme/tokens.dart';
import '../utils/formatters.dart';
import '../widgets/finance/finance_form.dart' show unawaitedSync;
import '../widgets/ui/basics.dart';
import '../widgets/ui/feedback.dart';
import '../widgets/ui/fields.dart';

/* ------------------------------------------------------------------ */
/* Form                                                                */
/* ------------------------------------------------------------------ */

Future<void> showTaskForm(BuildContext context, {Task? task, String? lockedClientId}) {
  return showAppSheet<void>(
    context,
    title: task == null ? 'Adicionar tarefa' : 'Editar tarefa',
    builder: (context) => _TaskForm(task: task, lockedClientId: lockedClientId),
  );
}

class _TaskForm extends ConsumerStatefulWidget {
  const _TaskForm({this.task, this.lockedClientId});
  final Task? task;
  final String? lockedClientId;

  @override
  ConsumerState<_TaskForm> createState() => _TaskFormState();
}

class _TaskFormState extends ConsumerState<_TaskForm> {
  late final TextEditingController _title;
  late final TextEditingController _description;
  late Priority _priority;
  late EntityStatus _status;
  String? _clientId;
  DateTime? _dueDate;
  TimeOfDay? _dueTime;

  final _errors = <String, String>{};
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final task = widget.task;
    _title = TextEditingController(text: task?.title ?? '');
    _description = TextEditingController(text: task?.description ?? '');
    _priority = task?.priority ?? Priority.medium;
    _status = task?.status ?? EntityStatus.pending;
    _clientId = task?.clientId ?? widget.lockedClientId;
    _dueDate = task?.dueDate;
    _dueTime = hasExplicitTime(task?.dueDate)
        ? TimeOfDay(hour: task!.dueDate!.hour, minute: task.dueDate!.minute)
        : null;
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    super.dispose();
  }

  /// Combines the date and the optional time into one local DateTime. Leaving
  /// the time blank lands on local midnight, which the app reads as "no time
  /// set" (see hasExplicitTime).
  DateTime? get _resolvedDueDate {
    if (_dueDate == null) return null;
    return DateTime(
      _dueDate!.year,
      _dueDate!.month,
      _dueDate!.day,
      _dueTime?.hour ?? 0,
      _dueTime?.minute ?? 0,
    );
  }

  Future<void> _submit() async {
    _errors.clear();
    if (_title.text.trim().isEmpty) _errors['title'] = 'O título é obrigatório.';
    setState(() {});
    if (_errors.isNotEmpty) return;

    setState(() => _submitting = true);

    final input = TaskFormInput(
      title: _title.text.trim(),
      description: _description.text.trim().isEmpty ? null : _description.text.trim(),
      clientId: _clientId,
      clearClientId: _clientId == null,
      dueDate: _resolvedDueDate,
      clearDueDate: _resolvedDueDate == null,
      priority: _priority,
      status: _status,
    );

    try {
      final repository = ref.read(taskRepositoryProvider);
      if (widget.task == null) {
        await repository.create(input);
      } else {
        await repository.update(widget.task!.id, input);
      }
      ref.bumpData();
      unawaitedSync(ref);
      if (!mounted) return;
      Navigator.of(context).pop();
      showToast(context, widget.task == null ? 'Tarefa criada.' : 'Tarefa atualizada.');
    } catch (error) {
      if (!mounted) return;
      setState(() => _submitting = false);
      showToast(context, apiErrorMessage(error, 'Não foi possível salvar a tarefa.'),
          tone: ToastTone.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(dataRevisionProvider);
    final clients = ref.watch(clientRepositoryProvider).list();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        AppTextField(
          controller: _title,
          label: 'Título',
          hintText: 'Ex: Instalar impressora',
          error: _errors['title'],
        ),
        const SizedBox(height: 16),
        AppTextField(
          controller: _description,
          label: 'Descrição',
          hintText: 'Detalhes sobre a tarefa (opcional)',
          maxLines: 3,
        ),
        const SizedBox(height: 16),
        AppSelect<String?>(
          label: 'Cliente relacionado',
          value: _clientId,
          options: [
            const SelectOption<String?>(value: null, label: 'Nenhum cliente'),
            ...clients.map((c) => SelectOption<String?>(value: c.id, label: c.name)),
          ],
          onChanged: widget.lockedClientId != null
              ? (_) {}
              : (value) => setState(() => _clientId = value),
        ),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(
            child: DateField(
              label: 'Prazo',
              value: _dueDate,
              allowClear: true,
              onChanged: (value) => setState(() => _dueDate = value),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: TimeField(
              label: 'Horário (opcional)',
              value: _dueTime,
              onChanged: (value) => setState(() => _dueTime = value),
            ),
          ),
        ]),
        const SizedBox(height: 16),
        AppSelect<Priority>(
          label: 'Prioridade',
          value: _priority,
          options: Priority.values.map((p) => SelectOption(value: p, label: p.label)).toList(),
          onChanged: (value) => setState(() => _priority = value ?? Priority.medium),
        ),
        const SizedBox(height: 16),
        AppSelect<EntityStatus>(
          label: 'Status',
          value: _status,
          options: EntityStatus.values.map((s) => SelectOption(value: s, label: s.label)).toList(),
          onChanged: (value) => setState(() => _status = value ?? EntityStatus.pending),
        ),
        const SizedBox(height: 24),
        Row(children: [
          Expanded(
            child: AppButton(
              label: 'Cancelar',
              variant: AppButtonVariant.secondary,
              expand: true,
              onPressed: _submitting ? null : () => Navigator.of(context).pop(),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: AppButton(label: 'Salvar', expand: true, isLoading: _submitting, onPressed: _submit),
          ),
        ]),
      ],
    );
  }
}

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key, this.openFormOnEnter = false});

  final bool openFormOnEnter;

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen> {
  final _searchController = TextEditingController();
  String _search = '';
  EntityStatus? _status;
  Priority? _priority;

  @override
  void initState() {
    super.initState();
    if (widget.openFormOnEnter) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) showTaskForm(context);
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  bool get _hasFilters => _search.isNotEmpty || _status != null || _priority != null;

  void _clearFilters() {
    _searchController.clear();
    setState(() {
      _search = '';
      _status = null;
      _priority = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(dataRevisionProvider);
    final tasks = ref.watch(taskRepositoryProvider).list(TaskQuery(
          search: _search.isEmpty ? null : _search,
          status: _status,
          priority: _priority,
        ));

    return PageBody(children: [
      PageHeader(
        title: 'Tarefas',
        subtitle: 'Acompanhe o que precisa ser feito e os prazos.',
        action: AppButton(
          label: 'Adicionar tarefa',
          icon: Icons.add_rounded,
          onPressed: () => showTaskForm(context),
        ),
      ),
      Wrap(
        spacing: 12,
        runSpacing: 12,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          SizedBox(
            width: 300,
            child: SearchField(
              controller: _searchController,
              hintText: 'Buscar por título ou descrição',
              onChanged: (value) => setState(() => _search = value),
            ),
          ),
          SizedBox(
            width: 170,
            child: AppSelect<EntityStatus?>(
              value: _status,
              placeholder: 'Status',
              options: [
                const SelectOption<EntityStatus?>(value: null, label: 'Todos os status'),
                ...EntityStatus.values.map((s) => SelectOption<EntityStatus?>(value: s, label: s.label)),
              ],
              onChanged: (value) => setState(() => _status = value),
            ),
          ),
          SizedBox(
            width: 180,
            child: AppSelect<Priority?>(
              value: _priority,
              placeholder: 'Prioridade',
              options: [
                const SelectOption<Priority?>(value: null, label: 'Todas as prioridades'),
                ...Priority.values.map((p) => SelectOption<Priority?>(value: p, label: p.label)),
              ],
              onChanged: (value) => setState(() => _priority = value),
            ),
          ),
          if (_hasFilters)
            TextButton.icon(
              onPressed: _clearFilters,
              icon: const Icon(Icons.close_rounded, size: 15),
              label: const Text('Limpar filtros'),
              style: TextButton.styleFrom(foregroundColor: AppColors.sageGreen),
            ),
        ],
      ),
      if (tasks.isEmpty)
        EmptyState(
          icon: Icons.checklist_rounded,
          title: 'Nenhuma tarefa encontrada',
          description: _hasFilters
              ? 'Ajuste os filtros ou a busca para encontrar o que procura.'
              : 'Crie uma nova tarefa para começar.',
          action: _hasFilters
              ? AppButton(
                  label: 'Limpar filtros',
                  variant: AppButtonVariant.secondary,
                  onPressed: _clearFilters)
              : AppButton(
                  label: 'Adicionar tarefa',
                  icon: Icons.add_rounded,
                  onPressed: () => showTaskForm(context)),
        )
      else
        Column(
          children: [
            for (final task in tasks) ...[
              TaskTile(task: task, onTap: () => context.go('/tarefas/${task.id}')),
              const SizedBox(height: 12),
            ],
          ],
        ),
    ]);
  }
}

class TaskTile extends ConsumerWidget {
  const TaskTile({super.key, required this.task, this.onTap});

  final Task task;
  final VoidCallback? onTap;

  Future<void> _toggle(BuildContext context, WidgetRef ref) async {
    final next = task.status == EntityStatus.completed ? EntityStatus.pending : EntityStatus.completed;
    try {
      await ref.read(taskRepositoryProvider).updateStatus(task.id, next);
      ref.bumpData();
      unawaitedSync(ref);
      if (context.mounted) {
        showToast(context,
            next == EntityStatus.completed ? 'Tarefa concluída.' : 'Tarefa reaberta.');
      }
    } catch (error) {
      if (context.mounted) showToast(context, apiErrorMessage(error), tone: ToastTone.error);
    }
  }

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    final confirmed = await confirmDialog(
      context,
      title: 'Remover tarefa?',
      description: 'Essa ação não poderá ser desfeita para "${task.title}".',
    );
    if (!confirmed) return;
    try {
      await ref.read(taskRepositoryProvider).remove(task.id);
      ref.bumpData();
      unawaitedSync(ref);
      if (context.mounted) showToast(context, 'Tarefa removida.');
    } catch (error) {
      if (context.mounted) showToast(context, apiErrorMessage(error), tone: ToastTone.error);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final overdue = isOverdue(task.dueDate, task.status);
    final done = task.status == EntityStatus.completed;

    return AppCard(
      padding: const EdgeInsets.all(16),
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppCheckbox(
            value: done,
            onChanged: (_) => _toggle(context, ref),
            label: 'Marcar "${task.title}" como concluída',
            hideLabel: true,
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  task.title,
                  overflow: TextOverflow.ellipsis,
                  style: AppText.bodyStrong.copyWith(
                    color: done ? AppColors.textSecondary : AppColors.textPrimary,
                    decoration: done ? TextDecoration.lineThrough : null,
                  ),
                ),
                Text(task.client?.name ?? 'Sem cliente',
                    overflow: TextOverflow.ellipsis, style: AppText.caption),
                const SizedBox(height: 10),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  StatusBadge(status: task.status),
                  if (overdue)
                    const AppBadge(label: 'Vencida', tone: BadgeTone.danger)
                  else if (task.dueDate != null)
                    AppBadge(label: formatTaskDue(task.dueDate!)),
                ]),
              ],
            ),
          ),
          PriorityFlag(priority: task.priority),
          PopupMenuButton<String>(
            tooltip: 'Ações',
            icon: const Icon(Icons.more_vert_rounded, size: 18, color: AppColors.textSecondary),
            onSelected: (value) => switch (value) {
              'edit' => showTaskForm(context, task: task),
              'delete' => _delete(context, ref),
              _ => null,
            },
            itemBuilder: (context) => const [
              PopupMenuItem(
                value: 'edit',
                child: Row(children: [
                  Icon(Icons.edit_outlined, size: 17),
                  SizedBox(width: 10),
                  Text('Editar'),
                ]),
              ),
              PopupMenuItem(
                value: 'delete',
                child: Row(children: [
                  Icon(Icons.delete_outline_rounded, size: 17, color: AppColors.danger),
                  SizedBox(width: 10),
                  Text('Remover', style: TextStyle(color: AppColors.danger)),
                ]),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/* ------------------------------------------------------------------ */
/* Details                                                             */
/* ------------------------------------------------------------------ */

class TaskDetailsScreen extends ConsumerWidget {
  const TaskDetailsScreen({super.key, required this.taskId});

  final String taskId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(dataRevisionProvider);
    final task = ref.watch(taskRepositoryProvider).get(taskId);

    if (task == null) {
      return PageBody(children: [
        EmptyState(
          icon: Icons.search_off_rounded,
          title: 'Tarefa não encontrada',
          description: 'Ela pode ter sido removida em outro aparelho.',
          action: AppButton(label: 'Voltar', onPressed: () => context.go('/tarefas')),
        ),
      ]);
    }

    return PageBody(children: [
      Row(children: [
        AppIconButton(
          icon: Icons.arrow_back_rounded,
          tooltip: 'Voltar',
          onPressed: () => context.go('/tarefas'),
        ),
        const SizedBox(width: 4),
        Expanded(child: PageHeader(title: task.title, subtitle: task.client?.name)),
      ]),
      AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(spacing: 8, runSpacing: 8, children: [
              StatusBadge(status: task.status),
              PriorityFlag(priority: task.priority),
              if (isOverdue(task.dueDate, task.status))
                const AppBadge(label: 'Vencida', tone: BadgeTone.danger),
            ]),
            const SizedBox(height: 20),
            if (task.description != null) ...[
              Text('Descrição', style: AppText.bodyStrong.copyWith(color: AppColors.textSecondary)),
              const SizedBox(height: 4),
              Text(task.description!, style: AppText.body),
              const SizedBox(height: 16),
            ],
            if (task.dueDate != null)
              _row(Icons.event_rounded, 'Prazo', formatTaskDue(task.dueDate!)),
            _row(Icons.schedule_rounded, 'Criada em', formatDateTime(task.createdAt)),
            if (task.completedAt != null)
              _row(Icons.check_circle_outline_rounded, 'Concluída em',
                  formatDateTime(task.completedAt!)),
            const SizedBox(height: 16),
            AppButton(
              label: 'Editar tarefa',
              icon: Icons.edit_outlined,
              variant: AppButtonVariant.secondary,
              expand: true,
              onPressed: () => showTaskForm(context, task: task),
            ),
          ],
        ),
      ),
    ]);
  }

  Widget _row(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(children: [
        Icon(icon, size: 17, color: AppColors.textSecondary),
        const SizedBox(width: 10),
        Expanded(child: Text(label, style: AppText.body.copyWith(color: AppColors.textSecondary))),
        Text(value, style: AppText.bodyStrong),
      ]),
    );
  }
}
