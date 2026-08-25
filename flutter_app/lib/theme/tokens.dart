import 'package:flutter/material.dart';

/// The design tokens, ported one-for-one from the web client's
/// tailwind.config.ts so both clients render the same product.
abstract final class AppColors {
  static const teaGreen = Color(0xFFC9F2C7);
  static const lightGreen = Color(0xFFACECA1);
  static const mutedOlive = Color(0xFF96BE8C);
  static const sageGreen = Color(0xFF629460);
  static const evergreen = Color(0xFF243119);
  static const evergreenHover = Color(0xFF31441F);

  static const success = Color(0xFF629460);
  static const successLight = Color(0xFFC9F2C7);
  static const warning = Color(0xFFF4C95D);
  static const danger = Color(0xFFD93A3A);
  static const dangerStrong = Color(0xFFC23131);

  static const textPrimary = Color(0xFF182014);
  static const textSecondary = Color(0xFF66705F);
  static const border = Color(0xFFDDE7D9);
  static const bgApp = Color(0xFFF7FAF5);
  static const surface = Color(0xFFFFFFFF);

  /// Chart chrome: gridlines sit one step off the surface, leaders one step
  /// darker again so they read as connectors rather than more gridlines.
  static const grid = Color(0xFFEAF0E6);
  static const leader = Color(0xFFC4D2BE);
  static const axisRule = Color(0xFFD6E2D1);

  /// The three ledger hues are semantic (lucro = verde, gasto = vermelho,
  /// investimento = azul) and were validated as a categorical set on a white
  /// surface: lightness band, chroma floor, normal-vision ΔE 29.0 and
  /// contrast >= 3:1 all pass. The verde<->vermelho pair sits at CVD ΔE 7.2
  /// (the 6-8 floor band), so anywhere the three appear together they carry
  /// secondary encoding — distinct marker shapes plus direct labels — never
  /// colour alone.
  static const financeIncome = Color(0xFF008300);
  static const financeIncomeSoft = Color(0xFFE2F3E0);
  static const financeExpense = Color(0xFFE34948);
  static const financeExpenseSoft = Color(0xFFFDEAEA);
  static const financeInvestment = Color(0xFF2A78D6);
  static const financeInvestmentSoft = Color(0xFFE6F0FC);
}

abstract final class AppRadius {
  static const card = 18.0;
  static const modal = 20.0;
  static const input = 12.0;
  static const button = 12.0;
  static const badge = 999.0;
}

abstract final class AppShadows {
  static const card = [
    BoxShadow(color: Color(0x0F243119), blurRadius: 24, offset: Offset(0, 6)),
  ];
  static const elevated = [
    BoxShadow(color: Color(0x1F243119), blurRadius: 50, offset: Offset(0, 18)),
  ];
}

/// Named text styles matching the web client's fontSize scale.
abstract final class AppText {
  static const _base = TextStyle(color: AppColors.textPrimary, height: 1.4);

  static const display = TextStyle(fontSize: 32, height: 1.2, fontWeight: FontWeight.w700, color: AppColors.textPrimary);
  static const h1 = TextStyle(fontSize: 28, height: 1.25, fontWeight: FontWeight.w700, color: AppColors.textPrimary);
  static const h1Mobile = TextStyle(fontSize: 24, height: 1.25, fontWeight: FontWeight.w700, color: AppColors.textPrimary);
  static const h2 = TextStyle(fontSize: 22, height: 1.3, fontWeight: FontWeight.w700, color: AppColors.textPrimary);
  static const h3 = TextStyle(fontSize: 18, height: 1.35, fontWeight: FontWeight.w600, color: AppColors.textPrimary);
  static const bodyLg = TextStyle(fontSize: 16, height: 1.5, color: AppColors.textPrimary);
  static const body = TextStyle(fontSize: 14, height: 1.5, color: AppColors.textPrimary);
  static const bodyStrong = TextStyle(fontSize: 14, height: 1.5, fontWeight: FontWeight.w600, color: AppColors.textPrimary);
  static const caption = TextStyle(fontSize: 12, height: 1.4, color: AppColors.textSecondary);
  static const micro = TextStyle(fontSize: 11, height: 1.3, fontWeight: FontWeight.w500, color: AppColors.textSecondary);

  static TextStyle get fallback => _base;
}

/// The single breakpoint that decides between the phone layout (bottom nav,
/// stacked cards) and the desktop one (sidebar, side-by-side columns).
const double kDesktopBreakpoint = 1024;

bool isDesktop(BuildContext context) => MediaQuery.sizeOf(context).width >= kDesktopBreakpoint;
