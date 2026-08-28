import 'package:intl/intl.dart';

import '../models/enums.dart';

final _currency = NumberFormat.currency(locale: 'pt_BR', symbol: 'R\$');
final _dateFormat = DateFormat('dd/MM/yyyy', 'pt_BR');
final _dateTimeFormat = DateFormat("dd/MM/yyyy 'às' HH:mm", 'pt_BR');
final _timeFormat = DateFormat('HH:mm', 'pt_BR');
final _monthShort = DateFormat('MMM', 'pt_BR');
final _monthLong = DateFormat("MMMM 'de' yyyy", 'pt_BR');
final _weekday = DateFormat("EEEE, dd 'de' MMMM", 'pt_BR');

String formatCurrency(num value) => _currency.format(value);

/// Currency for tight spaces (chart axes, small tiles): "R$ 1,2 mil" instead
/// of "R$ 1.200,00". Full precision still lives in the tooltip and the tables.
String formatCompactCurrency(num value) {
  final abs = value.abs();
  if (abs >= 1000000) return 'R\$ ${_trim(value / 1000000)} mi';
  if (abs >= 1000) return 'R\$ ${_trim(value / 1000)} mil';
  return 'R\$ ${_trim(value)}';
}

String _trim(num value) {
  final rounded = (value * 10).round() / 10;
  final text = rounded == rounded.roundToDouble()
      ? rounded.round().toString()
      : rounded.toStringAsFixed(1).replaceAll('.', ',');
  return text;
}

String formatDate(DateTime value) => _dateFormat.format(value);
String formatDateTime(DateTime value) => _dateTimeFormat.format(value);
String formatTime(DateTime value) => _timeFormat.format(value);
String formatPercent(num value) => '${value.round()}%';

String formatWeekdayLong(DateTime value) => _capitalize(_weekday.format(value));

/// "Ago" / "Agosto de 2026" — month labels for axes and headers.
String formatMonthShort(DateTime value) => _capitalize(_monthShort.format(value).replaceAll('.', ''));
String formatMonthLong(DateTime value) => _capitalize(_monthLong.format(value));

String _capitalize(String value) =>
    value.isEmpty ? value : value[0].toUpperCase() + value.substring(1);

DateTime startOfDay(DateTime value) => DateTime(value.year, value.month, value.day);

bool isSameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

bool isToday(DateTime value) => isSameDay(value, DateTime.now());

String formatRelativeDate(DateTime value) {
  final now = DateTime.now();
  if (isSameDay(value, now)) return 'Hoje';
  if (isSameDay(value, now.add(const Duration(days: 1)))) return 'Amanhã';
  if (isSameDay(value, now.subtract(const Duration(days: 1)))) return 'Ontem';
  return formatDate(value);
}

/// Whether a due date carries an explicit time-of-day rather than just a
/// calendar date. Dates built without a time land exactly on local midnight,
/// so that is the signal — a task genuinely due at "00:00 sharp" is not a
/// realistic case here, and treating it as date-only keeps the reminder
/// feature (which needs a real timestamp) from misfiring on plain due dates.
bool hasExplicitTime(DateTime? value) {
  if (value == null) return false;
  return value.hour != 0 || value.minute != 0;
}

/// Relative day label for a task due date, plus "às HH:mm" when it carries an
/// explicit time.
String formatTaskDue(DateTime value) {
  final label = formatRelativeDate(value);
  return hasExplicitTime(value) ? '$label às ${formatTime(value)}' : label;
}

bool isOverdue(DateTime? dueDate, EntityStatus status) {
  if (dueDate == null || status == EntityStatus.completed) return false;
  final now = DateTime.now();
  return dueDate.isBefore(now) && !isSameDay(dueDate, now);
}

/// Applies the (99) 99999-9999 mask as digits are typed.
String maskPhone(String rawValue) {
  final digits = rawValue.replaceAll(RegExp(r'\D'), '');
  final trimmed = digits.length > 11 ? digits.substring(0, 11) : digits;
  if (trimmed.isEmpty) return '';
  if (trimmed.length <= 2) return '($trimmed';
  if (trimmed.length <= 6) return '(${trimmed.substring(0, 2)}) ${trimmed.substring(2)}';
  if (trimmed.length <= 10) {
    return '(${trimmed.substring(0, 2)}) ${trimmed.substring(2, 6)}-${trimmed.substring(6)}';
  }
  return '(${trimmed.substring(0, 2)}) ${trimmed.substring(2, 7)}-${trimmed.substring(7)}';
}

String getInitials(String name) {
  final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return '';
  if (parts.length == 1) return parts.first[0].toUpperCase();
  return (parts.first[0] + parts.last[0]).toUpperCase();
}

enum DeliveryUrgency { overdue, today, soon, upcoming, done }

class DeliveryCountdown {
  const DeliveryCountdown({required this.label, required this.urgency, required this.days});
  final String label;
  final DeliveryUrgency urgency;

  /// Whole days until delivery; negative once the date has passed.
  final int days;
}

/// How long until a client's delivery date, as a ready-to-render label.
/// Compares calendar days (not elapsed hours), so a delivery later today
/// reads "Entrega hoje" rather than "faltam 0 dias".
DeliveryCountdown? getDeliveryCountdown(DateTime? deliveryDate, {bool completed = false}) {
  if (deliveryDate == null) return null;

  final days = startOfDay(deliveryDate).difference(startOfDay(DateTime.now())).inDays;

  // A delivered project is not late, however long ago the date was.
  if (completed) return DeliveryCountdown(label: 'Entregue', urgency: DeliveryUrgency.done, days: days);

  if (days < 0) {
    final overdueBy = days.abs();
    return DeliveryCountdown(
      label: overdueBy == 1 ? 'Atrasado 1 dia' : 'Atrasado $overdueBy dias',
      urgency: DeliveryUrgency.overdue,
      days: days,
    );
  }
  if (days == 0) return DeliveryCountdown(label: 'Entrega hoje', urgency: DeliveryUrgency.today, days: days);
  if (days == 1) return DeliveryCountdown(label: 'Entrega amanhã', urgency: DeliveryUrgency.today, days: days);
  if (days <= 7) return DeliveryCountdown(label: 'Faltam $days dias', urgency: DeliveryUrgency.soon, days: days);
  if (days <= 30) return DeliveryCountdown(label: 'Faltam $days dias', urgency: DeliveryUrgency.upcoming, days: days);

  final months = (days / 30).round();
  return DeliveryCountdown(
    label: months == 1 ? 'Falta 1 mês' : 'Faltam $months meses',
    urgency: DeliveryUrgency.upcoming,
    days: days,
  );
}

const _homeHideAfter = Duration(hours: 24);

/// Completed clients stay on Home for a day so a "just finished" project is
/// still visible right after wrapping up, then fall off to declutter — they
/// remain fully manageable on the Clientes page either way.
///
/// Tasks are deliberately not on this rule: a checked-off task leaves Home
/// immediately (see DashboardRepository) and lives out its last 24h on the
/// Tarefas screen instead.
bool isHiddenFromHome({required bool completed, DateTime? completedAt}) {
  if (!completed || completedAt == null) return false;
  return DateTime.now().difference(completedAt) > _homeHideAfter;
}

/// How long a completed task is kept before it is purged for good.
const completedTaskTtl = Duration(hours: 24);

/// When a completed task stops existing: 24h after it was checked off.
///
/// Tasks completed through the edit form before `completedAt` was kept in
/// step with `status` carry no completion stamp — `updatedAt` is the closest
/// thing to one, and using it means those rows still age out instead of
/// lingering forever. Null for anything not completed.
DateTime? completedTaskExpiry({
  required bool completed,
  DateTime? completedAt,
  required DateTime updatedAt,
}) {
  if (!completed) return null;
  return (completedAt ?? updatedAt).add(completedTaskTtl);
}

/// Whether a completed task has outlived its 24h stay and is due to be purged
/// (see TaskRepository.purgeExpiredCompleted).
bool isExpiredCompletedTask({
  required bool completed,
  DateTime? completedAt,
  required DateTime updatedAt,
}) {
  final expiry = completedTaskExpiry(
    completed: completed,
    completedAt: completedAt,
    updatedAt: updatedAt,
  );
  return expiry != null && !expiry.isAfter(DateTime.now());
}

/// "Some em 23 h" — how much of the 24h stay a completed task has left, so it
/// reads as on its way out rather than gone by accident.
String? formatCompletedRetention({
  required bool completed,
  DateTime? completedAt,
  required DateTime updatedAt,
}) {
  final expiry = completedTaskExpiry(
    completed: completed,
    completedAt: completedAt,
    updatedAt: updatedAt,
  );
  if (expiry == null) return null;

  final left = expiry.difference(DateTime.now());
  if (left <= Duration.zero) return 'Removendo…';
  if (left.inHours >= 1) return 'Some em ${left.inHours} h';
  return 'Some em ${left.inMinutes < 1 ? 1 : left.inMinutes} min';
}
