import 'dart:math' as math;

import '../models/enums.dart';
import '../models/models.dart';
import 'formatters.dart';

/* ------------------------------------------------------------------ */
/* Month bucketing                                                     */
/* ------------------------------------------------------------------ */

class MonthBucket {
  MonthBucket({
    required this.key,
    required this.label,
    required this.fullLabel,
    this.income = 0,
    this.expense = 0,
    this.investment = 0,
  });

  /// 'YYYY-MM' — stable key, independent of locale.
  final String key;

  /// Axis label: 'Ago'.
  final String label;

  /// Tooltip label: 'Agosto de 2026'.
  final String fullLabel;

  double income;
  double expense;
  double investment;

  /// income − expense. Investimento is money moved, not spent, so it
  /// deliberately stays out of this.
  double get net => income - expense;

  double valueFor(FinanceKind kind) => switch (kind) {
        FinanceKind.income => income,
        FinanceKind.expense => expense,
        FinanceKind.investment => investment,
      };

  void add(FinanceKind kind, double value) {
    switch (kind) {
      case FinanceKind.income:
        income += value;
      case FinanceKind.expense:
        expense += value;
      case FinanceKind.investment:
        investment += value;
    }
  }
}

String monthKey(DateTime date) =>
    '${date.year}-${date.month.toString().padLeft(2, '0')}';

class MonthShare {
  const MonthShare(this.key, this.value);
  final String key;
  final double value;
}

/// Which months a lançamento lands in, and how much in each.
///
/// Everything except a parcelled card despesa hits a single month. A card
/// despesa in N parcelas spreads `amount / N` across the N months starting at
/// its date — so a R$ 1.200 purchase in 12x reads as R$ 100 per month on the
/// chart instead of a single spike that never matches the real bill.
List<MonthShare> monthlyShares(FinanceEntry entry) {
  final parcels = entry.kind == FinanceKind.expense && entry.paymentMethod == PaymentMethod.card
      ? math.max(1, entry.installments ?? 1)
      : 1;

  final value = entry.amount / parcels;
  return List.generate(parcels, (i) {
    final month = DateTime(entry.date.year, entry.date.month + i, 1);
    return MonthShare(monthKey(month), value);
  });
}

/// The last [count] months, oldest first, ending on the current month.
List<DateTime> lastMonths(int count, [DateTime? reference]) {
  final ref = reference ?? DateTime.now();
  return List.generate(count, (i) => DateTime(ref.year, ref.month - (count - 1 - i), 1));
}

/// Totals per month for the Home chart. Months with no lançamento still come
/// back (as zeros) so the x-axis is a continuous timeline rather than a list
/// of whichever months happen to have data.
List<MonthBucket> buildMonthlySeries(
  List<FinanceEntry> entries, {
  int count = 5,
  DateTime? reference,
}) {
  final buckets = <String, MonthBucket>{};

  for (final monthStart in lastMonths(count, reference)) {
    final key = monthKey(monthStart);
    buckets[key] = MonthBucket(
      key: key,
      label: formatMonthShort(monthStart),
      fullLabel: formatMonthLong(monthStart),
    );
  }

  for (final entry in entries) {
    for (final share in monthlyShares(entry)) {
      buckets[share.key]?.add(entry.kind, share.value);
    }
  }

  return buckets.values.toList();
}

/* ------------------------------------------------------------------ */
/* Headline totals                                                     */
/* ------------------------------------------------------------------ */

class FinanceTotals {
  const FinanceTotals({this.income = 0, this.expense = 0, this.investment = 0});
  final double income;
  final double expense;
  final double investment;

  /// income − expense.
  double get net => income - expense;

  double valueFor(FinanceKind kind) => switch (kind) {
        FinanceKind.income => income,
        FinanceKind.expense => expense,
        FinanceKind.investment => investment,
      };
}

/// Totals for one month — what the panel at the top of Home reports.
FinanceTotals totalsForMonth(List<FinanceEntry> entries, [DateTime? reference]) {
  final ref = reference ?? DateTime.now();
  final key = monthKey(DateTime(ref.year, ref.month, 1));

  var income = 0.0, expense = 0.0, investment = 0.0;
  for (final entry in entries) {
    for (final share in monthlyShares(entry)) {
      if (share.key != key) continue;
      switch (entry.kind) {
        case FinanceKind.income:
          income += share.value;
        case FinanceKind.expense:
          expense += share.value;
        case FinanceKind.investment:
          investment += share.value;
      }
    }
  }

  return FinanceTotals(income: income, expense: expense, investment: investment);
}

double sumAmounts(Iterable<FinanceEntry> entries) =>
    entries.fold(0.0, (total, entry) => total + entry.amount);

/* ------------------------------------------------------------------ */
/* Contas a pagar                                                      */
/* ------------------------------------------------------------------ */

class BillsSummary {
  const BillsSummary({
    this.openTotal = 0,
    this.openCount = 0,
    this.overdueCount = 0,
    this.overdueTotal = 0,
    this.dueSoonCount = 0,
  });

  /// Everything still unpaid, at full value.
  final double openTotal;
  final int openCount;
  final int overdueCount;
  final double overdueTotal;

  /// Unpaid and falling due within the next 7 days (today included).
  final int dueSoonCount;
}

BillsSummary summarizeBills(List<FinanceEntry> entries, [DateTime? reference]) {
  final today = startOfDay(reference ?? DateTime.now());
  final weekAhead = today.add(const Duration(days: 7));

  var openTotal = 0.0, overdueTotal = 0.0;
  var openCount = 0, overdueCount = 0, dueSoonCount = 0;

  for (final entry in entries) {
    if (entry.kind != FinanceKind.expense || entry.paid) continue;

    final due = startOfDay(entry.date);
    openTotal += entry.amount;
    openCount += 1;

    if (due.isBefore(today)) {
      overdueCount += 1;
      overdueTotal += entry.amount;
    } else if (!due.isAfter(weekAhead)) {
      dueSoonCount += 1;
    }
  }

  return BillsSummary(
    openTotal: openTotal,
    openCount: openCount,
    overdueCount: overdueCount,
    overdueTotal: overdueTotal,
    dueSoonCount: dueSoonCount,
  );
}

/// True when an unpaid despesa's due date is already behind us.
bool isBillOverdue(FinanceEntry entry, [DateTime? reference]) {
  if (entry.kind != FinanceKind.expense || entry.paid) return false;
  return startOfDay(entry.date).isBefore(startOfDay(reference ?? DateTime.now()));
}

/// How a despesa gets paid, in one line: 'Pix' or 'Cartão · 3x de R$ 100,00'.
String describePayment(FinanceEntry entry) {
  if (entry.kind != FinanceKind.expense) return '';
  if (entry.paymentMethod != PaymentMethod.card) return 'Pix';

  final parcels = math.max(1, entry.installments ?? 1);
  if (parcels <= 1) return 'Cartão · à vista';
  return 'Cartão · ${parcels}x de ${formatCurrency(entry.amount / parcels)}';
}

/* ------------------------------------------------------------------ */
/* CDI yield simulation                                                */
/* ------------------------------------------------------------------ */

/// Brazilian fixed income compounds over *business* days, not calendar days:
/// 252 in a year, ~21 in a month. Using 365/30 here would overstate the yield.
const int businessDaysPerYear = 252;
const int businessDaysPerMonth = 21;

/// The daily rate implied by an annual CDI quote — the market's own
/// conversion, `(1 + anual) ^ (1/252) − 1`.
double cdiDailyRate(double annualCdiPercent) =>
    math.pow(1 + annualCdiPercent / 100, 1 / businessDaysPerYear).toDouble() - 1;

/// IR regressivo on renda fixa: the longer the money stays in, the smaller
/// the bite. Brackets are counted in calendar days held.
double incomeTaxRate(int calendarDays) {
  if (calendarDays <= 180) return 0.225;
  if (calendarDays <= 360) return 0.20;
  if (calendarDays <= 720) return 0.175;
  return 0.15;
}

class YieldSimulationMonth {
  const YieldSimulationMonth({required this.month, required this.grossBalance, required this.grossYield});
  final int month;
  final double grossBalance;
  final double grossYield;
}

class YieldSimulation {
  const YieldSimulation({
    required this.principal,
    required this.months,
    required this.monthlyRate,
    required this.periodRate,
    required this.effectiveAnnualRate,
    required this.grossBalance,
    required this.grossYield,
    required this.taxRate,
    required this.tax,
    required this.netBalance,
    required this.netYield,
    required this.breakdown,
  });

  final double principal;
  final int months;

  /// Effective rate for one month, as a fraction (0.011 = 1,10%).
  final double monthlyRate;

  /// Effective rate over the whole horizon, compounded.
  final double periodRate;

  /// What this rate compounds to over 12 months.
  final double effectiveAnnualRate;

  final double grossBalance;
  final double grossYield;
  final double taxRate;
  final double tax;
  final double netBalance;
  final double netYield;

  /// Month-by-month balances, for the projection table.
  final List<YieldSimulationMonth> breakdown;
}

/// How much a given amount yields at a given slice of the CDI.
///
/// The percentual do CDI applies to the *daily* rate — that is the actual
/// market convention. Applying it to the annual rate instead (anual × 1,10)
/// would quietly inflate every result.
YieldSimulation simulateYield({
  required double principal,
  required double annualCdiPercent,
  required double cdiPercent,
  required int months,
  bool taxExempt = false,
}) {
  final safePrincipal = math.max(0.0, principal);
  final safeMonths = math.max(1, months);

  final dailyRate = cdiDailyRate(math.max(0.0, annualCdiPercent));
  final effectiveDailyRate = dailyRate * (math.max(0.0, cdiPercent) / 100);

  final monthlyRate = math.pow(1 + effectiveDailyRate, businessDaysPerMonth).toDouble() - 1;
  final periodRate = math.pow(1 + monthlyRate, safeMonths).toDouble() - 1;

  final breakdown = List.generate(safeMonths, (i) {
    final grossBalance = safePrincipal * math.pow(1 + monthlyRate, i + 1).toDouble();
    return YieldSimulationMonth(
      month: i + 1,
      grossBalance: grossBalance,
      grossYield: grossBalance - safePrincipal,
    );
  });

  final grossBalance = safePrincipal * (1 + periodRate);
  final grossYield = grossBalance - safePrincipal;

  // The IR brackets count calendar days, so months are converted at the
  // average month length (30.44), not a flat 30. It matters exactly at the
  // boundaries: 12 months is 365 days (17,5%), not 360 (20%).
  final taxRate = taxExempt ? 0.0 : incomeTaxRate((safeMonths * 30.44).round());
  final tax = grossYield * taxRate;

  return YieldSimulation(
    principal: safePrincipal,
    months: safeMonths,
    monthlyRate: monthlyRate,
    periodRate: periodRate,
    effectiveAnnualRate: math.pow(1 + monthlyRate, 12).toDouble() - 1,
    grossBalance: grossBalance,
    grossYield: grossYield,
    taxRate: taxRate,
    tax: tax,
    netBalance: grossBalance - tax,
    netYield: grossYield - tax,
    breakdown: breakdown,
  );
}

/// 12,34% — a fraction rendered the way rates are quoted here.
String formatRate(double value, {int digits = 2}) =>
    '${(value * 100).toStringAsFixed(digits).replaceAll('.', ',')}%';

/// What the whole investment portfolio is expected to yield in a month, at
/// each application's own percentual do CDI. An estimate, not a statement: it
/// assumes the informed CDI holds and ignores taxes.
double estimateMonthlyYield(List<FinanceEntry> entries, double annualCdiPercent) {
  final dailyRate = cdiDailyRate(annualCdiPercent);

  return entries.where((e) => e.kind == FinanceKind.investment).fold(0.0, (total, entry) {
    final share = math.max(0.0, entry.cdiPercent ?? 100) / 100;
    final monthlyRate = math.pow(1 + dailyRate * share, businessDaysPerMonth).toDouble() - 1;
    return total + entry.amount * monthlyRate;
  });
}

/// Only a starting point — whatever the user types replaces it from then on.
const double defaultAnnualCdi = 14.9;
