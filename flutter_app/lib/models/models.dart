import 'enums.dart';

/// Parses whatever the API or the local store hands back for a date.
DateTime? _date(dynamic value) {
  if (value == null) return null;
  if (value is DateTime) return value;
  return DateTime.tryParse(value.toString())?.toLocal();
}

DateTime _requiredDate(dynamic value) => _date(value) ?? DateTime.now();

double _num(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

String? _str(dynamic value) {
  final text = value?.toString();
  if (text == null || text.isEmpty) return null;
  return text;
}

class User {
  const User({required this.id, required this.name, required this.email, this.avatarUrl});

  final String id;
  final String name;
  final String email;
  final String? avatarUrl;

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: (json['id'] ?? json['_id'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
        email: (json['email'] ?? '').toString(),
        avatarUrl: _str(json['avatarUrl']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        if (avatarUrl != null) 'avatarUrl': avatarUrl,
      };
}

/// `id` is a UUID generated on the device at creation time — it is the
/// canonical identifier everywhere (local store, API, routes), not a Mongo
/// _id. That is what makes offline creation possible: the id never changes
/// once assigned, whether or not the record has synced yet. On the wire the
/// server calls it `localId`.
class Client {
  const Client({
    required this.id,
    required this.name,
    required this.phone,
    required this.service,
    required this.price,
    required this.initials,
    required this.priority,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.avatarUrl,
    this.deliveryDate,
    this.completedAt,
  });

  final String id;
  final String name;
  final String phone;
  final String service;
  final double price;
  final String initials;
  final Priority priority;
  final EntityStatus status;
  final String? avatarUrl;

  /// Agreed delivery date for this client's project.
  final DateTime? deliveryDate;
  final DateTime createdAt;
  final DateTime updatedAt;

  /// Set when status becomes completed — drives the Home 24h auto-hide and
  /// dates the receita this client produces.
  final DateTime? completedAt;

  factory Client.fromJson(Map<String, dynamic> json) => Client(
        id: (json['localId'] ?? json['id']).toString(),
        name: (json['name'] ?? '').toString(),
        phone: (json['phone'] ?? '').toString(),
        service: (json['service'] ?? '').toString(),
        price: _num(json['price']),
        initials: (json['initials'] ?? '').toString(),
        priority: PriorityWire.fromWire(json['priority']?.toString()),
        status: EntityStatusWire.fromWire(json['status']?.toString()),
        avatarUrl: _str(json['avatarUrl']),
        deliveryDate: _date(json['deliveryDate']),
        createdAt: _requiredDate(json['createdAt']),
        updatedAt: _requiredDate(json['updatedAt']),
        completedAt: _date(json['completedAt']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'phone': phone,
        'service': service,
        'price': price,
        'initials': initials,
        'priority': priority.wire,
        'status': status.wire,
        'avatarUrl': avatarUrl,
        'deliveryDate': deliveryDate?.toIso8601String(),
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'completedAt': completedAt?.toIso8601String(),
      };

  Client copyWith({
    String? name,
    String? phone,
    String? service,
    double? price,
    String? initials,
    Priority? priority,
    EntityStatus? status,
    String? avatarUrl,
    DateTime? deliveryDate,
    bool clearDeliveryDate = false,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? completedAt,
    bool clearCompletedAt = false,
  }) =>
      Client(
        id: id,
        name: name ?? this.name,
        phone: phone ?? this.phone,
        service: service ?? this.service,
        price: price ?? this.price,
        initials: initials ?? this.initials,
        priority: priority ?? this.priority,
        status: status ?? this.status,
        avatarUrl: avatarUrl ?? this.avatarUrl,
        deliveryDate: clearDeliveryDate ? null : (deliveryDate ?? this.deliveryDate),
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        completedAt: clearCompletedAt ? null : (completedAt ?? this.completedAt),
      );
}

/// The slice of a Client a Task shows inline. Resolved locally rather than
/// fetched, so it works offline.
class TaskClientRef {
  const TaskClientRef({required this.id, required this.name, required this.initials, this.avatarUrl});

  final String id;
  final String name;
  final String initials;
  final String? avatarUrl;

  factory TaskClientRef.fromClient(Client client) => TaskClientRef(
        id: client.id,
        name: client.name,
        initials: client.initials,
        avatarUrl: client.avatarUrl,
      );
}

class Task {
  const Task({
    required this.id,
    required this.title,
    required this.priority,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.description,
    this.clientId,
    this.dueDate,
    this.completedAt,
    this.reminderEnabled = false,
    this.client,
  });

  final String id;
  final String title;
  final String? description;

  /// References Client.id. Display info comes from [client], joined locally.
  final String? clientId;

  /// May carry a real time-of-day, not just a calendar date — local midnight
  /// means "no time set" (see hasExplicitTime in formatters.dart).
  final DateTime? dueDate;
  final Priority priority;
  final EntityStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? completedAt;

  /// Opted in to a reminder notification 5h before dueDate.
  final bool reminderEnabled;

  /// Joined locally, never persisted.
  final TaskClientRef? client;

  factory Task.fromJson(Map<String, dynamic> json) {
    // The server may send clientId either as a plain string or as a populated
    // object; normalise both to the id here.
    final rawClient = json['clientId'];
    final clientId = rawClient is Map
        ? (rawClient['localId'] ?? rawClient['id'])?.toString()
        : _str(rawClient);

    return Task(
      id: (json['localId'] ?? json['id']).toString(),
      title: (json['title'] ?? '').toString(),
      description: _str(json['description']),
      clientId: clientId,
      dueDate: _date(json['dueDate']),
      priority: PriorityWire.fromWire(json['priority']?.toString()),
      status: EntityStatusWire.fromWire(json['status']?.toString()),
      createdAt: _requiredDate(json['createdAt']),
      updatedAt: _requiredDate(json['updatedAt']),
      completedAt: _date(json['completedAt']),
      reminderEnabled: json['reminderEnabled'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'clientId': clientId,
        'dueDate': dueDate?.toIso8601String(),
        'priority': priority.wire,
        'status': status.wire,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'completedAt': completedAt?.toIso8601String(),
        'reminderEnabled': reminderEnabled,
      };

  Task copyWith({
    String? title,
    String? description,
    bool clearDescription = false,
    String? clientId,
    bool clearClientId = false,
    DateTime? dueDate,
    bool clearDueDate = false,
    Priority? priority,
    EntityStatus? status,
    DateTime? updatedAt,
    DateTime? completedAt,
    bool clearCompletedAt = false,
    bool? reminderEnabled,
    TaskClientRef? client,
  }) =>
      Task(
        id: id,
        title: title ?? this.title,
        description: clearDescription ? null : (description ?? this.description),
        clientId: clearClientId ? null : (clientId ?? this.clientId),
        dueDate: clearDueDate ? null : (dueDate ?? this.dueDate),
        priority: priority ?? this.priority,
        status: status ?? this.status,
        createdAt: createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        completedAt: clearCompletedAt ? null : (completedAt ?? this.completedAt),
        reminderEnabled: reminderEnabled ?? this.reminderEnabled,
        client: client ?? this.client,
      );
}

class FinanceEntry {
  const FinanceEntry({
    required this.id,
    required this.kind,
    required this.description,
    required this.amount,
    required this.date,
    required this.createdAt,
    required this.updatedAt,
    this.category,
    this.notes,
    this.clientId,
    this.paid = false,
    this.paidAt,
    this.paymentMethod,
    this.installments,
    this.cdiPercent,
    this.source = FinanceSource.manual,
  });

  final String id;
  final FinanceKind kind;
  final String description;

  /// Always the FULL value in BRL, never a parcela — the monthly share of a
  /// card purchase is derived (amount / installments).
  final double amount;

  /// income → recebido em; expense → vence em; investment → aplicado em.
  final DateTime date;
  final String? category;
  final String? notes;

  /// The Client that produced this receita. Only set on derived entries.
  final String? clientId;

  // --- expense-only ---
  final bool paid;
  final DateTime? paidAt;
  final PaymentMethod? paymentMethod;

  /// 1 for pix or à vista; > 1 spreads [amount] over that many months.
  final int? installments;

  // --- investment-only ---
  /// Percentage OF the CDI (e.g. 110 = 110% do CDI).
  final double? cdiPercent;

  final DateTime createdAt;
  final DateTime updatedAt;

  /// Derived entries are read-only; the client is where they are edited.
  final FinanceSource source;

  bool get isDerived => source == FinanceSource.client;

  factory FinanceEntry.fromJson(Map<String, dynamic> json) => FinanceEntry(
        id: (json['localId'] ?? json['id']).toString(),
        kind: FinanceKindWire.fromWire(json['kind']?.toString()),
        description: (json['description'] ?? '').toString(),
        amount: _num(json['amount']),
        date: _requiredDate(json['date']),
        category: _str(json['category']),
        notes: _str(json['notes']),
        clientId: _str(json['clientId']),
        paid: json['paid'] == true,
        paidAt: _date(json['paidAt']),
        paymentMethod: PaymentMethodWire.fromWire(json['paymentMethod']?.toString()),
        installments: (json['installments'] as num?)?.toInt(),
        cdiPercent: json['cdiPercent'] == null ? null : _num(json['cdiPercent']),
        createdAt: _requiredDate(json['createdAt']),
        updatedAt: _requiredDate(json['updatedAt']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'kind': kind.wire,
        'description': description,
        'amount': amount,
        'date': date.toIso8601String(),
        'category': category,
        'notes': notes,
        'clientId': clientId,
        'paid': paid,
        'paidAt': paidAt?.toIso8601String(),
        'paymentMethod': paymentMethod?.wire,
        'installments': installments,
        'cdiPercent': cdiPercent,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };

  FinanceEntry copyWith({
    FinanceKind? kind,
    String? description,
    double? amount,
    DateTime? date,
    String? category,
    bool clearCategory = false,
    String? notes,
    bool clearNotes = false,
    String? clientId,
    bool clearClientId = false,
    bool? paid,
    DateTime? paidAt,
    bool clearPaidAt = false,
    PaymentMethod? paymentMethod,
    bool clearPaymentMethod = false,
    int? installments,
    bool clearInstallments = false,
    double? cdiPercent,
    bool clearCdiPercent = false,
    DateTime? updatedAt,
  }) =>
      FinanceEntry(
        id: id,
        kind: kind ?? this.kind,
        description: description ?? this.description,
        amount: amount ?? this.amount,
        date: date ?? this.date,
        category: clearCategory ? null : (category ?? this.category),
        notes: clearNotes ? null : (notes ?? this.notes),
        clientId: clearClientId ? null : (clientId ?? this.clientId),
        paid: paid ?? this.paid,
        paidAt: clearPaidAt ? null : (paidAt ?? this.paidAt),
        paymentMethod: clearPaymentMethod ? null : (paymentMethod ?? this.paymentMethod),
        installments: clearInstallments ? null : (installments ?? this.installments),
        cdiPercent: clearCdiPercent ? null : (cdiPercent ?? this.cdiPercent),
        createdAt: createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        source: source,
      );

  /// Mirrors the server's normalizeByKind: a receita must never keep a
  /// parcela count, a despesa never a CDI rate. Applying it locally too means
  /// the row the UI renders right after an edit already matches what the
  /// server will store — no shape flip when the round trip lands.
  FinanceEntry normalized() {
    if (kind == FinanceKind.expense) {
      return copyWith(
        clearCdiPercent: true,
        installments: paymentMethod == PaymentMethod.card
            ? (installments == null || installments! < 1 ? 1 : installments)
            : 1,
        paidAt: paid ? (paidAt ?? DateTime.now()) : null,
        clearPaidAt: !paid,
      );
    }
    return copyWith(
      paid: false,
      clearPaidAt: true,
      clearPaymentMethod: true,
      clearInstallments: true,
      clearCdiPercent: kind != FinanceKind.investment,
    );
  }
}

class DashboardCounts {
  const DashboardCounts({
    required this.total,
    required this.completed,
    required this.pending,
    required this.completionRate,
    this.inProgress = 0,
    this.overdue = 0,
  });

  final int total;
  final int completed;
  final int pending;
  final int inProgress;
  final int overdue;
  final int completionRate;
}

class DashboardSummary {
  const DashboardSummary({
    required this.clients,
    required this.tasks,
    required this.recentClients,
    required this.recentTasks,
  });

  final DashboardCounts clients;
  final DashboardCounts tasks;
  final List<Client> recentClients;
  final List<Task> recentTasks;
}

/// Something the user is saving toward: "Viajar", "Notebook novo".
class Goal {
  const Goal({
    required this.id,
    required this.title,
    required this.targetAmount,
    required this.targetDate,
    required this.createdAt,
    required this.updatedAt,
    this.notes,
    this.completedAt,
  });

  final String id;
  final String title;

  /// How much they want to have put aside by [targetDate].
  final double targetAmount;

  /// Stored as a real date rather than the "5 meses" the form asks for: a
  /// stored duration would silently mean something different tomorrow.
  final DateTime targetDate;
  final String? notes;

  /// Set when the goal is reached, so it can be celebrated once and then stop
  /// competing for attention on Home.
  final DateTime? completedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory Goal.fromJson(Map<String, dynamic> json) => Goal(
        id: (json['localId'] ?? json['id']).toString(),
        title: (json['title'] ?? '').toString(),
        targetAmount: _num(json['targetAmount']),
        targetDate: _requiredDate(json['targetDate']),
        notes: _str(json['notes']),
        completedAt: _date(json['completedAt']),
        createdAt: _requiredDate(json['createdAt']),
        updatedAt: _requiredDate(json['updatedAt']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'targetAmount': targetAmount,
        'targetDate': targetDate.toIso8601String(),
        'notes': notes,
        'completedAt': completedAt?.toIso8601String(),
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };

  Goal copyWith({
    String? title,
    double? targetAmount,
    DateTime? targetDate,
    String? notes,
    bool clearNotes = false,
    DateTime? completedAt,
    bool clearCompletedAt = false,
    DateTime? updatedAt,
  }) =>
      Goal(
        id: id,
        title: title ?? this.title,
        targetAmount: targetAmount ?? this.targetAmount,
        targetDate: targetDate ?? this.targetDate,
        notes: clearNotes ? null : (notes ?? this.notes),
        completedAt: clearCompletedAt ? null : (completedAt ?? this.completedAt),
        createdAt: createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
}

/// One deposit toward a goal.
///
/// Its own record rather than a running total on the Goal: two devices each
/// adding a deposit while offline both survive, because each is an
/// independent create. A single `savedAmount` field would resolve
/// last-write-wins and quietly drop one of them.
class GoalContribution {
  const GoalContribution({
    required this.id,
    required this.goalId,
    required this.amount,
    required this.date,
    required this.createdAt,
    required this.updatedAt,
    this.note,
  });

  final String id;
  final String goalId;

  /// Negative on purpose is allowed: it is how a mistaken deposit gets undone
  /// without erasing the history of what happened.
  final double amount;
  final DateTime date;
  final String? note;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory GoalContribution.fromJson(Map<String, dynamic> json) => GoalContribution(
        id: (json['localId'] ?? json['id']).toString(),
        goalId: (json['goalId'] ?? '').toString(),
        amount: _num(json['amount']),
        date: _requiredDate(json['date']),
        note: _str(json['note']),
        createdAt: _requiredDate(json['createdAt']),
        updatedAt: _requiredDate(json['updatedAt']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'goalId': goalId,
        'amount': amount,
        'date': date.toIso8601String(),
        'note': note,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };
}

/// A goal with its deposits already folded in — what every view renders.
class GoalProgress {
  const GoalProgress({required this.goal, required this.contributions});

  final Goal goal;

  /// Newest first.
  final List<GoalContribution> contributions;

  double get saved => contributions.fold(0.0, (total, c) => total + c.amount);

  double get remaining {
    final left = goal.targetAmount - saved;
    return left < 0 ? 0 : left;
  }

  /// 0..1, clamped — a goal that overshot still reads as full, not as 130%.
  double get percent {
    if (goal.targetAmount <= 0) return 0;
    final value = saved / goal.targetAmount;
    return value.clamp(0.0, 1.0);
  }

  bool get isComplete => saved >= goal.targetAmount;

  /// Whole months left, floored at zero — the prazo the user set.
  int get monthsLeft {
    final now = DateTime.now();
    final months = (goal.targetDate.year - now.year) * 12 + (goal.targetDate.month - now.month);
    return months < 0 ? 0 : months;
  }

  bool get isOverdue => !isComplete && goal.targetDate.isBefore(DateTime.now());

  /// What still needs to go in each month to land on time. Answers the
  /// question the prazo actually raises: "am I saving enough?"
  double get monthlyNeeded {
    if (isComplete) return 0;
    final months = monthsLeft;
    return months <= 0 ? remaining : remaining / months;
  }
}
