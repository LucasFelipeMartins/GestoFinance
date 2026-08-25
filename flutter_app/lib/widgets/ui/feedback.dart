import 'package:flutter/material.dart';

import '../../theme/tokens.dart';
import 'basics.dart';

enum ToastTone { success, error, info }

/// One-line feedback after a mutation. Uses a SnackBar so it behaves the same
/// on web and on both mobile platforms.
void showToast(BuildContext context, String message, {ToastTone tone = ToastTone.success}) {
  final (icon, color) = switch (tone) {
    ToastTone.success => (Icons.check_circle_rounded, AppColors.teaGreen),
    ToastTone.error => (Icons.error_rounded, const Color(0xFFFFB4B4)),
    ToastTone.info => (Icons.info_rounded, AppColors.teaGreen),
  };

  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Row(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 10),
          Expanded(child: Text(message, style: AppText.body.copyWith(color: Colors.white))),
        ],
      ),
      duration: const Duration(seconds: 3),
      width: 420,
    ));
}

/// Destructive confirmation. Returns true only if the user confirmed.
Future<bool> confirmDialog(
  BuildContext context, {
  required String title,
  required String description,
  String confirmLabel = 'Remover',
  String cancelLabel = 'Cancelar',
}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title, style: AppText.h3),
      content: Text(description, style: AppText.body.copyWith(color: AppColors.textSecondary)),
      actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      actions: [
        AppButton(
          label: cancelLabel,
          variant: AppButtonVariant.secondary,
          onPressed: () => Navigator.of(context).pop(false),
        ),
        AppButton(
          label: confirmLabel,
          variant: AppButtonVariant.danger,
          onPressed: () => Navigator.of(context).pop(true),
        ),
      ],
    ),
  );
  return result ?? false;
}

/// The app's one modal surface.
///
/// A bottom sheet on a phone (thumb-reachable, familiar) and a centred dialog
/// on a wide screen, so forms never stretch across a desktop viewport.
Future<T?> showAppSheet<T>(
  BuildContext context, {
  required String title,
  required WidgetBuilder builder,
  double maxWidth = 560,
}) {
  if (isDesktop(context)) {
    return showDialog<T>(
      context: context,
      barrierColor: AppColors.evergreen.withValues(alpha: 0.4),
      builder: (context) => Dialog(
        insetPadding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxWidth, maxHeight: 720),
          child: _SheetBody(title: title, child: Builder(builder: builder)),
        ),
      ),
    );
  }

  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    barrierColor: AppColors.evergreen.withValues(alpha: 0.4),
    builder: (context) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.9),
        child: _SheetBody(title: title, grabber: true, child: Builder(builder: builder)),
      ),
    ),
  );
}

class _SheetBody extends StatelessWidget {
  const _SheetBody({required this.title, required this.child, this.grabber = false});

  final String title;
  final Widget child;
  final bool grabber;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 12, 8),
          child: Column(
            children: [
              if (grabber) ...[
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                const SizedBox(height: 14),
              ],
              Row(
                children: [
                  Expanded(child: Text(title, style: AppText.h3)),
                  IconButton(
                    onPressed: () => Navigator.of(context).maybePop(),
                    icon: const Icon(Icons.close_rounded, size: 20),
                    color: AppColors.textSecondary,
                    tooltip: 'Fechar',
                  ),
                ],
              ),
            ],
          ),
        ),
        Flexible(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
            child: child,
          ),
        ),
      ],
    );
  }
}
