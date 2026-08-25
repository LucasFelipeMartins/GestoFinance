import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:gestorpro/models/enums.dart';
import 'package:gestorpro/models/models.dart';
import 'package:gestorpro/utils/finance_math.dart';
import 'package:intl/date_symbol_data_local.dart';

/// Guards the arithmetic the whole Finanças module rests on. The UI is
/// verified by running the app; these are the numbers that would otherwise be
/// wrong silently.
void main() {
  // The month labels go through DateFormat, which needs the same locale data
  // main() loads before the first frame.
  setUpAll(() => initializeDateFormatting('pt_BR'));

  FinanceEntry entry({
    FinanceKind kind = FinanceKind.expense,
    double amount = 100,
    DateTime? date,
    PaymentMethod? method,
    int? installments,
    bool paid = false,
    double? cdiPercent,
  }) {
    final when = date ?? DateTime(2026, 8, 10);
    return FinanceEntry(
      id: 'x',
      kind: kind,
      description: 'x',
      amount: amount,
      date: when,
      paymentMethod: method,
      installments: installments,
      paid: paid,
      cdiPercent: cdiPercent,
      createdAt: when,
      updatedAt: when,
    );
  }

  group('monthlyShares', () {
    test('a pix despesa hits one month at full value', () {
      final shares = monthlyShares(entry(amount: 300, method: PaymentMethod.pix));
      expect(shares.length, 1);
      expect(shares.single.value, 300);
      expect(shares.single.key, '2026-08');
    });

    test('a card despesa in 3x spreads across three months', () {
      final shares = monthlyShares(entry(
        amount: 300,
        method: PaymentMethod.card,
        installments: 3,
        date: DateTime(2026, 7, 5),
      ));
      expect(shares.map((s) => s.key), ['2026-07', '2026-08', '2026-09']);
      expect(shares.every((s) => s.value == 100), isTrue);
    });

    test('the spread crosses the year boundary', () {
      final shares = monthlyShares(entry(
        amount: 200,
        method: PaymentMethod.card,
        installments: 2,
        date: DateTime(2026, 12, 20),
      ));
      expect(shares.map((s) => s.key), ['2026-12', '2027-01']);
    });

    test('a receita ignores any stray parcela count', () {
      final shares =
          monthlyShares(entry(kind: FinanceKind.income, amount: 500, installments: 5));
      expect(shares.length, 1);
      expect(shares.single.value, 500);
    });
  });

  group('buildMonthlySeries', () {
    final reference = DateTime(2026, 8, 24);
    final ledger = [
      entry(kind: FinanceKind.income, amount: 5200, date: DateTime(2026, 8, 2)),
      entry(amount: 1200, method: PaymentMethod.card, installments: 12, date: DateTime(2026, 5, 1)),
      entry(amount: 800, method: PaymentMethod.pix, date: DateTime(2026, 8, 15)),
      // Older than the window — must be excluded entirely.
      entry(kind: FinanceKind.income, amount: 9999, date: DateTime(2025, 1, 5)),
    ];

    test('returns five buckets, oldest first', () {
      final series = buildMonthlySeries(ledger, count: 5, reference: reference);
      expect(series.map((b) => b.key), ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08']);
    });

    test('the 12x parcela lands in every month of the window', () {
      final series = buildMonthlySeries(ledger, count: 5, reference: reference);
      expect(series.map((b) => b.expense), [0, 100, 100, 100, 900]);
    });

    test('entries outside the window are dropped', () {
      final series = buildMonthlySeries(ledger, count: 5, reference: reference);
      expect(series.every((b) => b.income != 9999), isTrue);
    });

    test('net is income minus expense', () {
      final series = buildMonthlySeries(ledger, count: 5, reference: reference);
      expect(series.last.net, 5200 - 900);
    });

    test('the current-month totals match the last chart bucket', () {
      final series = buildMonthlySeries(ledger, count: 5, reference: reference);
      final totals = totalsForMonth(ledger, reference);
      expect(totals.income, series.last.income);
      expect(totals.expense, series.last.expense);
    });
  });

  group('summarizeBills', () {
    test('splits open, overdue and due-soon', () {
      final summary = summarizeBills([
        entry(amount: 500, date: DateTime(2026, 8, 10)), // overdue
        entry(amount: 300, date: DateTime(2026, 8, 26)), // due in 2 days
        entry(amount: 700, date: DateTime(2026, 9, 30)), // far off
        entry(amount: 999, date: DateTime(2026, 8, 1), paid: true), // settled
        entry(kind: FinanceKind.income, amount: 5000), // not an expense
      ], DateTime(2026, 8, 24));

      expect(summary.openTotal, 1500);
      expect(summary.openCount, 3);
      expect(summary.overdueCount, 1);
      expect(summary.overdueTotal, 500);
      expect(summary.dueSoonCount, 1);
    });
  });

  group('CDI simulation', () {
    test('the daily rate compounds back to the annual rate', () {
      final daily = cdiDailyRate(14.9);
      expect(math.pow(1 + daily, 252) - 1, closeTo(0.149, 1e-9));
    });

    test('10.000 at 100% do CDI yields the market figure for one month', () {
      final result =
          simulateYield(principal: 10000, annualCdiPercent: 14.9, cdiPercent: 100, months: 1);
      // ~1,166% a.m. is the well-known ballpark for this Selic level.
      expect(result.monthlyRate * 100, closeTo(1.166, 0.02));
      expect(result.grossYield, closeTo(116.42, 0.05));
      expect(result.taxRate, 0.225);
      expect(result.netYield, closeTo(result.grossYield * 0.775, 1e-6));
    });

    test('the percentual applies to the daily rate, not the monthly one', () {
      final base =
          simulateYield(principal: 10000, annualCdiPercent: 14.9, cdiPercent: 100, months: 1);
      final boosted =
          simulateYield(principal: 10000, annualCdiPercent: 14.9, cdiPercent: 110, months: 1);

      // Compounding is convex, so scaling the DAILY rate lands slightly above
      // a naive 1.10x of the monthly result — proof it is not being applied to
      // the monthly rate.
      expect(boosted.grossYield, greaterThan(base.grossYield * 1.1));
      expect(boosted.grossYield / base.grossYield, closeTo(1.1, 0.01));
    });

    test('twelve months compounds to about the annual CDI', () {
      final result =
          simulateYield(principal: 10000, annualCdiPercent: 14.9, cdiPercent: 100, months: 12);
      expect(result.periodRate * 100, closeTo(14.9, 0.35));
      expect(result.breakdown.length, 12);
      expect(result.breakdown.last.grossBalance, closeTo(result.grossBalance, 1e-6));
    });

    test('IR brackets land on the right side of each boundary', () {
      double rateFor(int months) => simulateYield(
            principal: 1000,
            annualCdiPercent: 14.9,
            cdiPercent: 100,
            months: months,
          ).taxRate;

      expect(rateFor(1), 0.225);
      expect(rateFor(3), 0.225);
      expect(rateFor(6), 0.20);
      // 12 months is 365 calendar days, which is the 361-720 bracket.
      expect(rateFor(12), 0.175);
    });

    test('an exempt application pays no tax', () {
      final result = simulateYield(
        principal: 10000,
        annualCdiPercent: 14.9,
        cdiPercent: 100,
        months: 1,
        taxExempt: true,
      );
      expect(result.tax, 0);
      expect(result.netYield, result.grossYield);
    });
  });

  group('estimateMonthlyYield', () {
    test('equals the sum of each application simulated on its own', () {
      final portfolio = [
        entry(kind: FinanceKind.investment, amount: 10000, cdiPercent: 100),
        entry(kind: FinanceKind.investment, amount: 5000, cdiPercent: 110),
        entry(kind: FinanceKind.income, amount: 99999), // must be ignored
      ];

      final expected =
          simulateYield(principal: 10000, annualCdiPercent: 14.9, cdiPercent: 100, months: 1)
                  .grossYield +
              simulateYield(principal: 5000, annualCdiPercent: 14.9, cdiPercent: 110, months: 1)
                  .grossYield;

      expect(estimateMonthlyYield(portfolio, 14.9), closeTo(expected, 1e-6));
    });
  });

  group('describePayment', () {
    test('reads the parcela out of the total', () {
      expect(describePayment(entry(method: PaymentMethod.pix)), 'Pix');
      expect(
          describePayment(entry(method: PaymentMethod.card, installments: 1)), 'Cartão · à vista');
      expect(
        describePayment(entry(amount: 400, method: PaymentMethod.card, installments: 4)),
        startsWith('Cartão · 4x de '),
      );
    });
  });

  group('normalized', () {
    test('a pix despesa is forced to a single parcela', () {
      expect(entry(method: PaymentMethod.pix, installments: 7).normalized().installments, 1);
    });

    test('an investimento drops parcela and paid noise but keeps its CDI', () {
      final result = entry(
        kind: FinanceKind.investment,
        installments: 3,
        paid: true,
        cdiPercent: 110,
      ).normalized();

      expect(result.installments, isNull);
      expect(result.paid, isFalse);
      expect(result.cdiPercent, 110);
    });
  });
}
