import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../data/remote/api_client.dart';
import '../data/repositories/client_repository.dart';
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

Future<void> showClientForm(BuildContext context, {Client? client}) {
  return showAppSheet<void>(
    context,
    title: client == null ? 'Adicionar cliente' : 'Editar cliente',
    builder: (context) => _ClientForm(client: client),
  );
}

class _ClientForm extends ConsumerStatefulWidget {
  const _ClientForm({this.client});
  final Client? client;

  @override
  ConsumerState<_ClientForm> createState() => _ClientFormState();
}

class _ClientFormState extends ConsumerState<_ClientForm> {
  late final TextEditingController _name;
  late final TextEditingController _phone;
  late final TextEditingController _service;
  late double _price;
  late Priority _priority;
  late EntityStatus _status;
  DateTime? _deliveryDate;

  final _errors = <String, String>{};
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final client = widget.client;
    _name = TextEditingController(text: client?.name ?? '');
    _phone = TextEditingController(text: client?.phone ?? '');
    _service = TextEditingController(text: client?.service ?? '');
    _price = client?.price ?? 0;
    _priority = client?.priority ?? Priority.medium;
    _status = client?.status ?? EntityStatus.pending;
    _deliveryDate = client?.deliveryDate;
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _service.dispose();
    super.dispose();
  }

  bool _validate() {
    _errors.clear();
    if (_name.text.trim().length < 2) _errors['name'] = 'O nome deve ter ao menos 2 caracteres.';
    // Matches the server's phoneRegex — reject here rather than let the push
    // fail silently in the outbox later.
    if (!RegExp(r'^\(\d{2}\) \d{4,5}-\d{4}$').hasMatch(_phone.text.trim())) {
      _errors['phone'] = 'Informe um telefone no formato (99) 99999-9999.';
    }
    if (_service.text.trim().isEmpty) _errors['service'] = 'O serviço é obrigatório.';
    setState(() {});
    return _errors.isEmpty;
  }

  Future<void> _submit() async {
    if (!_validate()) return;
    setState(() => _submitting = true);

    final input = ClientFormInput(
      name: _name.text.trim(),
      phone: _phone.text.trim(),
      service: _service.text.trim(),
      price: _price,
      priority: _priority,
      status: _status,
      deliveryDate: _deliveryDate,
      clearDeliveryDate: _deliveryDate == null,
    );

    try {
      final repository = ref.read(clientRepositoryProvider);
      if (widget.client == null) {
        await repository.create(input);
      } else {
        await repository.update(widget.client!.id, input);
      }
      ref.bumpData();
      unawaitedSync(ref);
      if (!mounted) return;
      Navigator.of(context).pop();
      showToast(context, widget.client == null ? 'Cliente criado.' : 'Cliente atualizado.');
    } catch (error) {
      if (!mounted) return;
      setState(() => _submitting = false);
      showToast(context, apiErrorMessage(error, 'Não foi possível salvar o cliente.'),
          tone: ToastTone.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        AppTextField(controller: _name, label: 'Nome', hintText: 'Ex: Maria Silva', error: _errors['name']),
        const SizedBox(height: 16),
        AppTextField(
          controller: _phone,
          label: 'Telefone',
          hintText: '(32) 99999-9999',
          keyboardType: TextInputType.phone,
          inputFormatters: [PhoneInputFormatter()],
          error: _errors['phone'],
        ),
        const SizedBox(height: 16),
        AppTextField(
          controller: _service,
          label: 'Serviço',
          hintText: 'Ex: Manutenção de notebook',
          error: _errors['service'],
        ),
        const SizedBox(height: 16),
        CurrencyField(label: 'Preço', value: _price, onChanged: (v) => setState(() => _price = v)),
        const SizedBox(height: 16),
        DateField(
          label: 'Data de entrega (opcional)',
          value: _deliveryDate,
          allowClear: true,
          onChanged: (value) => setState(() => _deliveryDate = value),
        ),
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
            child: AppButton(
              label: 'Salvar',
              expand: true,
              isLoading: _submitting,
              onPressed: _submit,
            ),
          ),
        ]),
      ],
    );
  }
}

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

class ClientsScreen extends ConsumerStatefulWidget {
  const ClientsScreen({super.key, this.openFormOnEnter = false});

  final bool openFormOnEnter;

  @override
  ConsumerState<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends ConsumerState<ClientsScreen> {
  final _searchController = TextEditingController();
  String _search = '';
  EntityStatus? _status;
  Priority? _priority;
  String _sort = 'createdAt';
  bool _ascending = false;

  @override
  void initState() {
    super.initState();
    if (widget.openFormOnEnter) {
      // The mobile "+" sheet routes here with ?new=1 rather than trying to
      // open a sheet across a navigation.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) showClientForm(context);
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

  Future<void> _complete(Client client) async {
    try {
      await ref.read(clientRepositoryProvider).updateStatus(client.id, EntityStatus.completed);
      ref.bumpData();
      unawaitedSync(ref);
      if (!mounted) return;
      showToast(
        context,
        client.price > 0
            // Concluding a client silently creates a lucro — say so, otherwise
            // the money appearing on Home looks like it came from nowhere.
            ? 'Cliente concluído. ${formatCurrency(client.price)} entrou nos lucros.'
            : 'Cliente concluído.',
      );
    } catch (error) {
      if (mounted) {
        showToast(context, apiErrorMessage(error), tone: ToastTone.error);
      }
    }
  }

  Future<void> _delete(Client client) async {
    final confirmed = await confirmDialog(
      context,
      title: 'Remover cliente?',
      description: 'Essa ação não poderá ser desfeita para "${client.name}". '
          'As tarefas ligadas a ele serão desvinculadas.',
    );
    if (!confirmed) return;

    try {
      await ref
          .read(clientRepositoryProvider)
          .remove(client.id, ref.read(taskRepositoryProvider));
      ref.bumpData();
      unawaitedSync(ref);
      if (mounted) showToast(context, 'Cliente removido.');
    } catch (error) {
      if (mounted) showToast(context, apiErrorMessage(error), tone: ToastTone.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(dataRevisionProvider);
    final clients = ref.watch(clientRepositoryProvider).list(ClientQuery(
          search: _search.isEmpty ? null : _search,
          status: _status,
          priority: _priority,
          sort: _sort,
          ascending: _ascending,
        ));

    return PageBody(children: [
      PageHeader(
        title: 'Clientes',
        subtitle: 'Gerencie sua carteira de clientes e acompanhe prioridades.',
        action: AppButton(
          label: 'Adicionar cliente',
          icon: Icons.add_rounded,
          onPressed: () => showClientForm(context),
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
              hintText: 'Buscar por nome, telefone ou serviço',
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
          SizedBox(
            width: 180,
            child: AppSelect<String>(
              value: _sort,
              options: const [
                SelectOption(value: 'createdAt', label: 'Mais recentes'),
                SelectOption(value: 'name', label: 'Nome'),
                SelectOption(value: 'price', label: 'Preço'),
                SelectOption(value: 'priority', label: 'Prioridade'),
                SelectOption(value: 'deliveryDate', label: 'Data de entrega'),
              ],
              onChanged: (value) => setState(() => _sort = value ?? 'createdAt'),
            ),
          ),
          IconButton(
            onPressed: () => setState(() => _ascending = !_ascending),
            tooltip: _ascending ? 'Ordem crescente' : 'Ordem decrescente',
            icon: Icon(_ascending ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded),
            color: AppColors.textSecondary,
            style: IconButton.styleFrom(
              backgroundColor: AppColors.surface,
              side: const BorderSide(color: AppColors.border),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.input)),
              minimumSize: const Size(48, 48),
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
      if (clients.isEmpty)
        EmptyState(
          icon: Icons.people_alt_outlined,
          title: 'Nenhum cliente encontrado',
          description: _hasFilters
              ? 'Ajuste os filtros ou a busca para encontrar o que procura.'
              : 'Crie um novo cliente para começar.',
          action: _hasFilters
              ? AppButton(
                  label: 'Limpar filtros',
                  variant: AppButtonVariant.secondary,
                  onPressed: _clearFilters)
              : AppButton(
                  label: 'Adicionar cliente',
                  icon: Icons.add_rounded,
                  onPressed: () => showClientForm(context)),
        )
      else
        Column(
          children: [
            for (final client in clients) ...[
              ClientTile(
                client: client,
                onTap: () => context.go('/clientes/${client.id}'),
                onEdit: () => showClientForm(context, client: client),
                onDelete: () => _delete(client),
                onComplete: client.status == EntityStatus.completed ? null : () => _complete(client),
              ),
              const SizedBox(height: 12),
            ],
          ],
        ),
    ]);
  }
}

class ClientTile extends StatelessWidget {
  const ClientTile({
    super.key,
    required this.client,
    this.onTap,
    this.onEdit,
    this.onDelete,
    this.onComplete,
  });

  final Client client;
  final VoidCallback? onTap;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final VoidCallback? onComplete;

  @override
  Widget build(BuildContext context) {
    final countdown = getDeliveryCountdown(
      client.deliveryDate,
      completed: client.status == EntityStatus.completed,
    );

    return AppCard(
      padding: const EdgeInsets.all(16),
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppAvatar(
            name: client.name,
            initials: client.initials,
            imageUrl: client.avatarUrl,
            showCompletedBadge: client.status == EntityStatus.completed,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(client.name,
                              overflow: TextOverflow.ellipsis, style: AppText.bodyStrong),
                          Text(client.service,
                              overflow: TextOverflow.ellipsis, style: AppText.caption),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(formatCurrency(client.price), style: AppText.bodyStrong),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  StatusBadge(status: client.status),
                  if (countdown != null)
                    AppBadge(
                      label: countdown.label,
                      tone: switch (countdown.urgency) {
                        DeliveryUrgency.overdue => BadgeTone.danger,
                        DeliveryUrgency.today => BadgeTone.warning,
                        DeliveryUrgency.soon => BadgeTone.info,
                        DeliveryUrgency.done => BadgeTone.success,
                        DeliveryUrgency.upcoming => BadgeTone.neutral,
                      },
                    ),
                  AppBadge(label: client.phone),
                ]),
              ],
            ),
          ),
          PriorityFlag(priority: client.priority),
          PopupMenuButton<String>(
            tooltip: 'Ações',
            icon: const Icon(Icons.more_vert_rounded, size: 18, color: AppColors.textSecondary),
            onSelected: (value) => switch (value) {
              'edit' => onEdit?.call(),
              'complete' => onComplete?.call(),
              'delete' => onDelete?.call(),
              _ => null,
            },
            itemBuilder: (context) => [
              if (onComplete != null)
                const PopupMenuItem(
                  value: 'complete',
                  child: Row(children: [
                    Icon(Icons.check_circle_outline_rounded, size: 17),
                    SizedBox(width: 10),
                    Text('Concluir'),
                  ]),
                ),
              const PopupMenuItem(
                value: 'edit',
                child: Row(children: [
                  Icon(Icons.edit_outlined, size: 17),
                  SizedBox(width: 10),
                  Text('Editar'),
                ]),
              ),
              const PopupMenuItem(
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

class ClientDetailsScreen extends ConsumerWidget {
  const ClientDetailsScreen({super.key, required this.clientId});

  final String clientId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(dataRevisionProvider);
    final client = ref.watch(clientRepositoryProvider).get(clientId);

    if (client == null) {
      return PageBody(children: [
        EmptyState(
          icon: Icons.person_off_outlined,
          title: 'Cliente não encontrado',
          description: 'Ele pode ter sido removido em outro aparelho.',
          action: AppButton(label: 'Voltar', onPressed: () => context.go('/clientes')),
        ),
      ]);
    }

    final tasks = ref.watch(taskRepositoryProvider).list(TaskQuery(clientId: clientId));
    final countdown = getDeliveryCountdown(
      client.deliveryDate,
      completed: client.status == EntityStatus.completed,
    );

    return PageBody(children: [
      Row(children: [
        AppIconButton(
          icon: Icons.arrow_back_rounded,
          tooltip: 'Voltar',
          onPressed: () => context.go('/clientes'),
        ),
        const SizedBox(width: 4),
        Expanded(
          child: PageHeader(title: client.name, subtitle: client.service),
        ),
      ]),
      AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              AppAvatar(
                name: client.name,
                initials: client.initials,
                imageUrl: client.avatarUrl,
                size: 56,
                showCompletedBadge: client.status == EntityStatus.completed,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Wrap(spacing: 8, runSpacing: 8, children: [
                  StatusBadge(status: client.status),
                  PriorityFlag(priority: client.priority),
                  if (countdown != null) AppBadge(label: countdown.label),
                ]),
              ),
            ]),
            const SizedBox(height: 20),
            _row(Icons.phone_rounded, 'Telefone', client.phone),
            _row(Icons.work_outline_rounded, 'Serviço', client.service),
            _row(Icons.attach_money_rounded, 'Preço', formatCurrency(client.price)),
            if (client.deliveryDate != null)
              _row(Icons.event_rounded, 'Entrega', formatDate(client.deliveryDate!)),
            _row(Icons.schedule_rounded, 'Criado em', formatDateTime(client.createdAt)),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(
                child: AppButton(
                  label: 'Editar',
                  icon: Icons.edit_outlined,
                  variant: AppButtonVariant.secondary,
                  expand: true,
                  onPressed: () => showClientForm(context, client: client),
                ),
              ),
            ]),
          ],
        ),
      ),
      AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Tarefas deste cliente', style: AppText.h3),
            const SizedBox(height: 12),
            if (tasks.isEmpty)
              Text('Nenhuma tarefa vinculada.', style: AppText.body.copyWith(color: AppColors.textSecondary))
            else
              for (final task in tasks)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(children: [
                    Icon(
                      task.status == EntityStatus.completed
                          ? Icons.check_circle_rounded
                          : Icons.radio_button_unchecked_rounded,
                      size: 17,
                      color: task.status == EntityStatus.completed
                          ? AppColors.sageGreen
                          : AppColors.textSecondary,
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: Text(task.title, overflow: TextOverflow.ellipsis, style: AppText.body)),
                    if (task.dueDate != null)
                      Text(formatTaskDue(task.dueDate!), style: AppText.caption),
                  ]),
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
