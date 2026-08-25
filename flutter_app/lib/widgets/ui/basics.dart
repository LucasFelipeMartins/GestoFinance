import 'package:flutter/material.dart';

import '../../models/enums.dart';
import '../../theme/tokens.dart';
import '../../utils/meta.dart';

/// The surface everything sits on: white, hairline border, soft shadow.
class AppCard extends StatelessWidget {
  const AppCard({super.key, required this.child, this.padding, this.onTap});

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      padding: padding ?? const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadows.card,
      ),
      child: child,
    );

    if (onTap == null) return content;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.card),
      child: content,
    );
  }
}

enum AppButtonVariant { primary, secondary, ghost, danger }

class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.icon,
    this.isLoading = false,
    this.expand = false,
    this.compact = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? icon;
  final bool isLoading;
  final bool expand;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null || isLoading;

    final (background, foreground, border) = switch (variant) {
      AppButtonVariant.primary => (AppColors.evergreen, Colors.white, null),
      AppButtonVariant.secondary => (
          AppColors.surface,
          AppColors.evergreen,
          AppColors.sageGreen.withValues(alpha: 0.4)
        ),
      AppButtonVariant.ghost => (Colors.transparent, AppColors.evergreen, null),
      AppButtonVariant.danger => (AppColors.danger, Colors.white, null),
    };

    final button = Opacity(
      opacity: disabled ? 0.55 : 1,
      child: Material(
        color: background,
        borderRadius: BorderRadius.circular(AppRadius.button),
        child: InkWell(
          onTap: disabled ? null : onPressed,
          borderRadius: BorderRadius.circular(AppRadius.button),
          child: Container(
            height: compact ? 38 : 44,
            padding: EdgeInsets.symmetric(horizontal: compact ? 14 : 20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadius.button),
              border: border == null ? null : Border.all(color: border),
            ),
            child: Row(
              mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (isLoading)
                  SizedBox(
                    width: 17,
                    height: 17,
                    child: CircularProgressIndicator(strokeWidth: 2, color: foreground),
                  )
                else if (icon != null)
                  Icon(icon, size: 18, color: foreground),
                if (isLoading || icon != null) const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    label,
                    overflow: TextOverflow.ellipsis,
                    style: AppText.bodyStrong.copyWith(color: foreground),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    return expand ? SizedBox(width: double.infinity, child: button) : button;
  }
}

class AppIconButton extends StatelessWidget {
  const AppIconButton({
    super.key,
    required this.icon,
    required this.tooltip,
    this.onPressed,
    this.danger = false,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onPressed,
      tooltip: tooltip,
      icon: Icon(icon, size: 19),
      color: danger ? AppColors.danger : AppColors.textSecondary,
      splashRadius: 22,
      constraints: const BoxConstraints.tightFor(width: 40, height: 40),
      padding: EdgeInsets.zero,
    );
  }
}

enum BadgeTone { neutral, success, warning, danger, info }

class AppBadge extends StatelessWidget {
  const AppBadge({super.key, required this.label, this.tone = BadgeTone.neutral, this.icon, this.color, this.background});

  final String label;
  final BadgeTone tone;
  final IconData? icon;

  /// Overrides the tone — used where the colour carries a series identity.
  final Color? color;
  final Color? background;

  @override
  Widget build(BuildContext context) {
    final (fg, bg) = switch (tone) {
      BadgeTone.neutral => (AppColors.evergreen, AppColors.mutedOlive.withValues(alpha: 0.2)),
      BadgeTone.success => (AppColors.evergreen, AppColors.successLight),
      BadgeTone.warning => (const Color(0xFF7A5B00), AppColors.warning.withValues(alpha: 0.25)),
      BadgeTone.danger => (AppColors.danger, AppColors.danger.withValues(alpha: 0.15)),
      BadgeTone.info => (const Color(0xFF1E6E8C), const Color(0xFFDFF1F7)),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: background ?? bg,
        borderRadius: BorderRadius.circular(AppRadius.badge),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: color ?? fg),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: AppText.caption.copyWith(color: color ?? fg, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status});
  final EntityStatus status;

  @override
  Widget build(BuildContext context) {
    final meta = statusMeta[status]!;
    return AppBadge(label: status.label, color: meta.color, background: meta.background);
  }
}

/// A flag whose colour and tooltip carry the priority. The tooltip is what
/// keeps it from being colour-alone.
class PriorityFlag extends StatelessWidget {
  const PriorityFlag({super.key, required this.priority});
  final Priority priority;

  @override
  Widget build(BuildContext context) {
    final meta = priorityMeta[priority]!;
    return Tooltip(
      message: 'Prioridade ${priority.label.toLowerCase()}',
      child: Icon(Icons.flag_rounded, size: 18, color: meta.color),
    );
  }
}

class AppAvatar extends StatelessWidget {
  const AppAvatar({
    super.key,
    required this.name,
    this.initials,
    this.imageUrl,
    this.size = 40,
    this.showCompletedBadge = false,
  });

  final String name;
  final String? initials;
  final String? imageUrl;
  final double size;
  final bool showCompletedBadge;

  @override
  Widget build(BuildContext context) {
    final avatar = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.teaGreen,
        shape: BoxShape.circle,
        image: imageUrl == null ? null : DecorationImage(image: NetworkImage(imageUrl!), fit: BoxFit.cover),
      ),
      alignment: Alignment.center,
      child: imageUrl != null
          ? null
          : Text(
              initials ?? '',
              style: AppText.bodyStrong.copyWith(
                color: AppColors.evergreen,
                fontSize: size * 0.36,
              ),
            ),
    );

    if (!showCompletedBadge) return avatar;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        avatar,
        Positioned(
          right: -2,
          bottom: -2,
          child: Container(
            padding: const EdgeInsets.all(2),
            decoration: const BoxDecoration(color: AppColors.surface, shape: BoxShape.circle),
            child: const Icon(Icons.check_circle, size: 14, color: AppColors.sageGreen),
          ),
        ),
      ],
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    this.action,
  });

  final IconData icon;
  final String title;
  final String description;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
      decoration: BoxDecoration(
        color: AppColors.surface.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.border, style: BorderStyle.solid),
      ),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppColors.teaGreen.withValues(alpha: 0.6),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.sageGreen, size: 26),
          ),
          const SizedBox(height: 12),
          Text(title, style: AppText.h3, textAlign: TextAlign.center),
          const SizedBox(height: 6),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 320),
            child: Text(description, style: AppText.body.copyWith(color: AppColors.textSecondary), textAlign: TextAlign.center),
          ),
          if (action != null) ...[const SizedBox(height: 16), action!],
        ],
      ),
    );
  }
}

/// The completion ring on the Home operation card.
class PercentRing extends StatelessWidget {
  const PercentRing({super.key, required this.value, this.size = 56});

  final int value;
  final double size;

  @override
  Widget build(BuildContext context) {
    final clamped = value.clamp(0, 100);
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: size,
            height: size,
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: clamped / 100),
              duration: const Duration(milliseconds: 400),
              builder: (context, progress, _) => CircularProgressIndicator(
                value: progress,
                strokeWidth: 5,
                strokeCap: StrokeCap.round,
                backgroundColor: AppColors.border,
                valueColor: const AlwaysStoppedAnimation(AppColors.sageGreen),
              ),
            ),
          ),
          Text('$clamped%', style: AppText.caption.copyWith(
            color: AppColors.evergreen,
            fontWeight: FontWeight.w600,
          )),
        ],
      ),
    );
  }
}

/// The standard page heading: title, supporting line, primary action.
class PageHeader extends StatelessWidget {
  const PageHeader({super.key, required this.title, this.subtitle, this.action, this.eyebrow});

  final String title;
  final String? subtitle;
  final Widget? action;
  final String? eyebrow;

  @override
  Widget build(BuildContext context) {
    final heading = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (eyebrow != null) ...[
          Text(
            eyebrow!.toUpperCase(),
            style: AppText.caption.copyWith(
              color: AppColors.sageGreen,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 4),
        ],
        Text(title, style: AppText.h2),
        if (subtitle != null) ...[
          const SizedBox(height: 4),
          Text(subtitle!, style: AppText.body.copyWith(color: AppColors.textSecondary)),
        ],
      ],
    );

    if (action == null) return heading;

    return LayoutBuilder(builder: (context, constraints) {
      if (constraints.maxWidth < 560) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [heading, const SizedBox(height: 16), action!],
        );
      }
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: heading),
          const SizedBox(width: 16),
          action!,
        ],
      );
    });
  }
}

/// Page body wrapper: the max width, gutters and bottom room for the mobile
/// nav that every screen shares.
class PageBody extends StatelessWidget {
  const PageBody({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final desktop = isDesktop(context);
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(
        desktop ? 32 : 16,
        24,
        desktop ? 32 : 16,
        desktop ? 40 : 112,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1400),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var i = 0; i < children.length; i++) ...[
                if (i > 0) const SizedBox(height: 20),
                children[i],
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// Skeleton block used while the first read settles.
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({super.key, this.height = 16, this.width, this.radius = 8});

  final double height;
  final double? width;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        color: AppColors.border.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(radius),
      ),
    );
  }
}
