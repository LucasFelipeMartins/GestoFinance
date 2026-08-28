import '../../models/enums.dart';
import '../../models/models.dart';
import 'api_client.dart';

/// Thin wrappers over the HTTP API. They speak the server's wire shape
/// (`localId`, populated clientId objects) and hand back domain models; only
/// the sync engine calls them.

class AuthResult {
  const AuthResult({required this.user, required this.token});
  final User user;
  final String token;
}

class AuthService {
  const AuthService();

  Future<AuthResult> login(String email, String password) async {
    final response = await ApiClient.instance.dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'email': email, 'password': password},
    );
    return _authResult(response.data!);
  }

  Future<AuthResult> register(String name, String email, String password) async {
    final response = await ApiClient.instance.dio.post<Map<String, dynamic>>(
      '/auth/register',
      data: {'name': name, 'email': email, 'password': password},
    );
    return _authResult(response.data!);
  }

  Future<User> me() async {
    final response = await ApiClient.instance.dio.get<Map<String, dynamic>>('/auth/me');
    return User.fromJson(Map<String, dynamic>.from(response.data!['user'] as Map));
  }

  Future<void> logout() async {
    await ApiClient.instance.dio.post<void>('/auth/logout');
  }

  AuthResult _authResult(Map<String, dynamic> data) => AuthResult(
        user: User.fromJson(Map<String, dynamic>.from(data['user'] as Map)),
        token: (data['token'] ?? '').toString(),
      );
}

class ClientService {
  const ClientService();

  Future<List<Client>> list() async {
    final response = await ApiClient.instance.dio.get<Map<String, dynamic>>('/clients');
    return (response.data!['clients'] as List)
        .map((raw) => Client.fromJson(Map<String, dynamic>.from(raw as Map)))
        .toList();
  }

  Future<Client> create(Map<String, dynamic> payload) async {
    final response = await ApiClient.instance.dio.post<Map<String, dynamic>>('/clients', data: payload);
    return Client.fromJson(Map<String, dynamic>.from(response.data!['client'] as Map));
  }

  Future<Client> update(String id, Map<String, dynamic> payload) async {
    final response = await ApiClient.instance.dio.put<Map<String, dynamic>>('/clients/$id', data: payload);
    return Client.fromJson(Map<String, dynamic>.from(response.data!['client'] as Map));
  }

  Future<Client> updateStatus(String id, Map<String, dynamic> payload) async {
    final response =
        await ApiClient.instance.dio.patch<Map<String, dynamic>>('/clients/$id/status', data: payload);
    return Client.fromJson(Map<String, dynamic>.from(response.data!['client'] as Map));
  }

  Future<void> remove(String id, {String? tasksAction}) async {
    await ApiClient.instance.dio.delete<void>(
      '/clients/$id',
      queryParameters: tasksAction == null ? null : {'tasksAction': tasksAction},
    );
  }
}

class TaskService {
  const TaskService();

  Future<List<Task>> list() async {
    final response = await ApiClient.instance.dio.get<Map<String, dynamic>>('/tasks');
    return (response.data!['tasks'] as List)
        .map((raw) => Task.fromJson(Map<String, dynamic>.from(raw as Map)))
        .toList();
  }

  Future<Task> create(Map<String, dynamic> payload) async {
    final response = await ApiClient.instance.dio.post<Map<String, dynamic>>('/tasks', data: payload);
    return Task.fromJson(Map<String, dynamic>.from(response.data!['task'] as Map));
  }

  Future<Task> update(String id, Map<String, dynamic> payload) async {
    final response = await ApiClient.instance.dio.put<Map<String, dynamic>>('/tasks/$id', data: payload);
    return Task.fromJson(Map<String, dynamic>.from(response.data!['task'] as Map));
  }

  Future<Task> updateStatus(String id, Map<String, dynamic> payload) async {
    final response =
        await ApiClient.instance.dio.patch<Map<String, dynamic>>('/tasks/$id/status', data: payload);
    return Task.fromJson(Map<String, dynamic>.from(response.data!['task'] as Map));
  }

  Future<void> remove(String id) async {
    await ApiClient.instance.dio.delete<void>('/tasks/$id');
  }
}

class FinanceService {
  const FinanceService();

  Future<List<FinanceEntry>> list() async {
    final response = await ApiClient.instance.dio.get<Map<String, dynamic>>('/finance');
    return (response.data!['entries'] as List)
        .map((raw) => FinanceEntry.fromJson(Map<String, dynamic>.from(raw as Map)))
        .toList();
  }

  Future<FinanceEntry> create(Map<String, dynamic> payload) async {
    final response = await ApiClient.instance.dio.post<Map<String, dynamic>>('/finance', data: payload);
    return FinanceEntry.fromJson(Map<String, dynamic>.from(response.data!['entry'] as Map));
  }

  Future<FinanceEntry> update(String id, Map<String, dynamic> payload) async {
    final response = await ApiClient.instance.dio.put<Map<String, dynamic>>('/finance/$id', data: payload);
    return FinanceEntry.fromJson(Map<String, dynamic>.from(response.data!['entry'] as Map));
  }

  Future<void> remove(String id) async {
    await ApiClient.instance.dio.delete<void>('/finance/$id');
  }
}

/* ------------------------------------------------------------------ */
/* Wire payload builders                                               */
/* ------------------------------------------------------------------ */

/// The server keys records by `localId` and validates with zod, so the
/// payloads it accepts are narrower than the model. These builders are the
/// single place that translation happens.

Map<String, dynamic> clientCreatePayload(Client client) => {
      'localId': client.id,
      'name': client.name,
      'phone': client.phone,
      'service': client.service,
      'price': client.price,
      'priority': client.priority.wire,
      'status': client.status.wire,
      if (client.avatarUrl != null) 'avatarUrl': client.avatarUrl,
      if (client.deliveryDate != null) 'deliveryDate': client.deliveryDate!.toIso8601String(),
      'createdAt': client.createdAt.toIso8601String(),
      'updatedAt': client.updatedAt.toIso8601String(),
    };

Map<String, dynamic> clientUpdatePayload(Client client) => {
      'name': client.name,
      'phone': client.phone,
      'service': client.service,
      'price': client.price,
      'priority': client.priority.wire,
      'status': client.status.wire,
      if (client.avatarUrl != null) 'avatarUrl': client.avatarUrl,
      // '' rather than omitted so a cleared date survives JSON and the server
      // can tell "clear it" from "field not included".
      'deliveryDate': client.deliveryDate?.toIso8601String() ?? '',
      'updatedAt': client.updatedAt.toIso8601String(),
    };

Map<String, dynamic> statusPayload(EntityStatus status, DateTime updatedAt, DateTime? completedAt) => {
      'status': status.wire,
      'updatedAt': updatedAt.toIso8601String(),
      if (completedAt != null) 'completedAt': completedAt.toIso8601String(),
    };

Map<String, dynamic> taskCreatePayload(Task task) => {
      'localId': task.id,
      'title': task.title,
      if (task.description != null) 'description': task.description,
      if (task.clientId != null) 'clientId': task.clientId,
      if (task.dueDate != null) 'dueDate': task.dueDate!.toIso8601String(),
      'priority': task.priority.wire,
      'status': task.status.wire,
      'reminderEnabled': task.reminderEnabled,
      'createdAt': task.createdAt.toIso8601String(),
      'updatedAt': task.updatedAt.toIso8601String(),
      // Sent alongside a completed status so the server starts the same 24h
      // retention clock the app is already counting from.
      if (task.completedAt != null) 'completedAt': task.completedAt!.toIso8601String(),
    };

Map<String, dynamic> taskUpdatePayload(Task task) => {
      'title': task.title,
      'description': task.description ?? '',
      'clientId': task.clientId ?? '',
      if (task.dueDate != null) 'dueDate': task.dueDate!.toIso8601String(),
      'priority': task.priority.wire,
      'status': task.status.wire,
      'reminderEnabled': task.reminderEnabled,
      'updatedAt': task.updatedAt.toIso8601String(),
      if (task.completedAt != null) 'completedAt': task.completedAt!.toIso8601String(),
    };

Map<String, dynamic> financeCreatePayload(FinanceEntry entry) => {
      'localId': entry.id,
      ...financeUpdatePayload(entry),
      'createdAt': entry.createdAt.toIso8601String(),
    };

Map<String, dynamic> financeUpdatePayload(FinanceEntry entry) => {
      'kind': entry.kind.wire,
      'description': entry.description,
      'amount': entry.amount,
      'date': entry.date.toIso8601String(),
      // '' rather than omitted for every clearable field: an omitted key reads
      // on the server as "field not included" and the old value survives, so
      // cleared text would come back on the next sync.
      'category': entry.category ?? '',
      'notes': entry.notes ?? '',
      'clientId': entry.clientId ?? '',
      'paid': entry.paid,
      if (entry.paidAt != null) 'paidAt': entry.paidAt!.toIso8601String(),
      if (entry.paymentMethod != null) 'paymentMethod': entry.paymentMethod!.wire,
      if (entry.installments != null) 'installments': entry.installments,
      if (entry.cdiPercent != null) 'cdiPercent': entry.cdiPercent,
      'updatedAt': entry.updatedAt.toIso8601String(),
    };

/// Goals and their deposits come back together — progress is meaningless
/// without both, so one round trip keeps them from arriving out of step.
class GoalsSnapshot {
  const GoalsSnapshot({required this.goals, required this.contributions});
  final List<Goal> goals;
  final List<GoalContribution> contributions;
}

class GoalService {
  const GoalService();

  Future<GoalsSnapshot> list() async {
    final response = await ApiClient.instance.dio.get<Map<String, dynamic>>('/goals');
    return GoalsSnapshot(
      goals: (response.data!['goals'] as List)
          .map((raw) => Goal.fromJson(Map<String, dynamic>.from(raw as Map)))
          .toList(),
      contributions: (response.data!['contributions'] as List)
          .map((raw) => GoalContribution.fromJson(Map<String, dynamic>.from(raw as Map)))
          .toList(),
    );
  }

  Future<Goal> create(Map<String, dynamic> payload) async {
    final response = await ApiClient.instance.dio.post<Map<String, dynamic>>('/goals', data: payload);
    return Goal.fromJson(Map<String, dynamic>.from(response.data!['goal'] as Map));
  }

  Future<Goal> update(String id, Map<String, dynamic> payload) async {
    final response =
        await ApiClient.instance.dio.put<Map<String, dynamic>>('/goals/$id', data: payload);
    return Goal.fromJson(Map<String, dynamic>.from(response.data!['goal'] as Map));
  }

  Future<void> remove(String id) async {
    await ApiClient.instance.dio.delete<void>('/goals/$id');
  }

  Future<GoalContribution> createContribution(Map<String, dynamic> payload) async {
    final response = await ApiClient.instance.dio
        .post<Map<String, dynamic>>('/goals/contributions/new', data: payload);
    return GoalContribution.fromJson(
        Map<String, dynamic>.from(response.data!['contribution'] as Map));
  }

  Future<GoalContribution> updateContribution(String id, Map<String, dynamic> payload) async {
    final response = await ApiClient.instance.dio
        .put<Map<String, dynamic>>('/goals/contributions/$id', data: payload);
    return GoalContribution.fromJson(
        Map<String, dynamic>.from(response.data!['contribution'] as Map));
  }

  Future<void> removeContribution(String id) async {
    await ApiClient.instance.dio.delete<void>('/goals/contributions/$id');
  }
}
