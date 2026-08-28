import '../../models/enums.dart';
import '../../models/models.dart';
import '../../utils/formatters.dart';
import 'client_repository.dart';
import 'task_repository.dart';

int _rate(int part, int total) => total == 0 ? 0 : ((part / total) * 100).round();

/// The Home counters, computed locally so the page works offline. Same shape
/// the old server /api/dashboard/summary returned.
class DashboardRepository {
  const DashboardRepository(this._clients, this._tasks);

  final ClientRepository _clients;
  final TaskRepository _tasks;

  DashboardSummary summary() {
    final clients = _clients.list(const ClientQuery(sort: 'createdAt'));
    final tasks = _tasks.list();

    final completedClients = clients.where((c) => c.status == EntityStatus.completed).length;
    final completedTasks = tasks.where((t) => t.status == EntityStatus.completed).length;

    // Completed clients linger on Home for a day, then drop out of the
    // "recent" list — they remain fully manageable on the Clientes screen.
    final recentClients = clients
        .where((c) => !isHiddenFromHome(
              completed: c.status == EntityStatus.completed,
              completedAt: c.completedAt,
            ))
        .take(5)
        .toList();

    // Tasks leave Home the moment they are checked off: Home is meant to show
    // what is still open. A finished task lives out its last 24h on the
    // Tarefas screen (see TaskRepository.purgeExpiredCompleted) and is then
    // deleted for good.
    final recentTasks = (tasks
          ..sort(defaultTaskSort))
        .where((t) => t.status != EntityStatus.completed)
        .take(5)
        .toList();

    return DashboardSummary(
      clients: DashboardCounts(
        total: clients.length,
        completed: completedClients,
        pending: clients.where((c) => c.status != EntityStatus.completed).length,
        completionRate: _rate(completedClients, clients.length),
      ),
      tasks: DashboardCounts(
        total: tasks.length,
        completed: completedTasks,
        pending: tasks.where((t) => t.status == EntityStatus.pending).length,
        inProgress: tasks.where((t) => t.status == EntityStatus.inProgress).length,
        overdue: tasks.where((t) => isOverdue(t.dueDate, t.status)).length,
        completionRate: _rate(completedTasks, tasks.length),
      ),
      recentClients: recentClients,
      recentTasks: recentTasks,
    );
  }
}
