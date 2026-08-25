import 'package:flutter/material.dart';

import '../models/enums.dart';
import '../theme/tokens.dart';

/// Marker shape per ledger. This is not decoration: lucro (verde) and gasto
/// (vermelho) sit at CVD ΔE 7.2 — inside the 6-8 floor band — so wherever the
/// three appear together the shape, not the colour, is what tells them apart.
enum SeriesShape { circle, square, triangle }

class FinanceKindMeta {
  const FinanceKindMeta({
    required this.color,
    required this.soft,
    required this.shape,
    required this.route,
    required this.dateLabel,
    required this.icon,
  });

  /// The mark colour — lines, markers, chips. Never applied to body text.
  final Color color;

  /// Tint for tiles and badges.
  final Color soft;
  final SeriesShape shape;
  final String route;

  /// What the `date` field means for this ledger.
  final String dateLabel;
  final IconData icon;
}

const financeMeta = <FinanceKind, FinanceKindMeta>{
  FinanceKind.income: FinanceKindMeta(
    color: AppColors.financeIncome,
    soft: AppColors.financeIncomeSoft,
    shape: SeriesShape.circle,
    route: '/lucros',
    dateLabel: 'Recebido em',
    icon: Icons.trending_up_rounded,
  ),
  FinanceKind.expense: FinanceKindMeta(
    color: AppColors.financeExpense,
    soft: AppColors.financeExpenseSoft,
    shape: SeriesShape.square,
    route: '/despesas',
    dateLabel: 'Vence em',
    icon: Icons.receipt_long_rounded,
  ),
  FinanceKind.investment: FinanceKindMeta(
    color: AppColors.financeInvestment,
    soft: AppColors.financeInvestmentSoft,
    shape: SeriesShape.triangle,
    route: '/investimentos',
    dateLabel: 'Aplicado em',
    icon: Icons.savings_rounded,
  ),
};

/// Fixed order — never re-derived from the data, so filtering a series out
/// never repaints the survivors.
const financeKindOrder = <FinanceKind>[
  FinanceKind.income,
  FinanceKind.expense,
  FinanceKind.investment,
];

/// Suggestions only — the category field stays free text so nobody is boxed in.
const financeCategories = <FinanceKind, List<String>>{
  FinanceKind.income: ['Serviço', 'Venda', 'Salário', 'Consultoria', 'Recorrência', 'Outros'],
  FinanceKind.expense: [
    'Fornecedor',
    'Ferramentas',
    'Assinaturas',
    'Impostos',
    'Transporte',
    'Moradia',
    'Outros',
  ],
  FinanceKind.investment: ['CDB', 'Tesouro Direto', 'LCI/LCA', 'Fundo', 'Poupança', 'Outros'],
};

class ToneMeta {
  const ToneMeta({required this.color, required this.background});
  final Color color;
  final Color background;
}

const priorityMeta = <Priority, ToneMeta>{
  Priority.critical: ToneMeta(color: Color(0xFFE53935), background: Color(0xFFFDECEC)),
  Priority.high: ToneMeta(color: Color(0xFFFB8C00), background: Color(0xFFFFF2E2)),
  Priority.medium: ToneMeta(color: Color(0xFFF4C20D), background: Color(0xFFFEF7DA)),
  Priority.low: ToneMeta(color: Color(0xFF7E57C2), background: Color(0xFFF1ECFA)),
  Priority.veryLow: ToneMeta(color: Color(0xFF1E88E5), background: Color(0xFFE7F2FC)),
};

const statusMeta = <EntityStatus, ToneMeta>{
  EntityStatus.pending: ToneMeta(color: Color(0xFF8A6D1D), background: Color(0xFFFEF3D6)),
  EntityStatus.inProgress: ToneMeta(color: Color(0xFF1E6E8C), background: Color(0xFFDFF1F7)),
  EntityStatus.completed: ToneMeta(color: Color(0xFF2F6B34), background: Color(0xFFDCF3DA)),
};
