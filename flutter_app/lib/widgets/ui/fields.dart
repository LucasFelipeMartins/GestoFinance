import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../theme/tokens.dart';
import '../../utils/formatters.dart';

/// A labelled field, with the label above and the error/hint below — the same
/// vertical rhythm as the web client's Input.
class LabeledField extends StatelessWidget {
  const LabeledField({super.key, this.label, this.error, this.hint, required this.child});

  final String? label;
  final String? error;
  final String? hint;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(label!, style: AppText.bodyStrong),
          const SizedBox(height: 6),
        ],
        child,
        if (error != null) ...[
          const SizedBox(height: 6),
          Text(error!, style: AppText.caption.copyWith(color: AppColors.danger)),
        ] else if (hint != null) ...[
          const SizedBox(height: 6),
          Text(hint!, style: AppText.caption),
        ],
      ],
    );
  }
}

class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    this.controller,
    this.label,
    this.hintText,
    this.error,
    this.hint,
    this.prefixIcon,
    this.keyboardType,
    this.obscureText = false,
    this.maxLines = 1,
    this.onChanged,
    this.inputFormatters,
    this.textInputAction,
    this.onSubmitted,
    this.autofillHints,
    this.enabled = true,
  });

  final TextEditingController? controller;
  final String? label;
  final String? hintText;
  final String? error;
  final String? hint;
  final IconData? prefixIcon;
  final TextInputType? keyboardType;
  final bool obscureText;
  final int maxLines;
  final ValueChanged<String>? onChanged;
  final List<TextInputFormatter>? inputFormatters;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;
  final Iterable<String>? autofillHints;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return LabeledField(
      label: label,
      error: error,
      hint: hint,
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        obscureText: obscureText,
        maxLines: obscureText ? 1 : maxLines,
        onChanged: onChanged,
        inputFormatters: inputFormatters,
        textInputAction: textInputAction,
        onSubmitted: onSubmitted,
        autofillHints: autofillHints,
        enabled: enabled,
        style: AppText.body,
        decoration: InputDecoration(
          hintText: hintText,
          prefixIcon: prefixIcon == null
              ? null
              : Icon(prefixIcon, size: 18, color: AppColors.textSecondary),
          errorText: null,
          enabledBorder: error == null ? null : _errorBorder,
          focusedBorder: error == null ? null : _errorBorder,
        ),
      ),
    );
  }

  static final _errorBorder = OutlineInputBorder(
    borderRadius: BorderRadius.circular(AppRadius.input),
    borderSide: const BorderSide(color: AppColors.danger),
  );
}

/// BRL amount field.
///
/// Typing fills from the right in cents (1 -> 0,01 -> 0,12 -> 1,23), which is
/// how every Brazilian banking app behaves and what makes this usable on a
/// phone keypad — a plain decimal field would ask for a separator half of
/// mobile keyboards do not offer.
class CurrencyField extends StatefulWidget {
  const CurrencyField({
    super.key,
    required this.value,
    required this.onChanged,
    this.label,
    this.error,
    this.hint,
  });

  final double value;
  final ValueChanged<double> onChanged;
  final String? label;
  final String? error;
  final String? hint;

  @override
  State<CurrencyField> createState() => _CurrencyFieldState();
}

class _CurrencyFieldState extends State<CurrencyField> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: _format(widget.value));
  }

  @override
  void didUpdateWidget(covariant CurrencyField oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Only follow an external change; never fight the user mid-keystroke.
    if (widget.value != oldWidget.value && _parse(_controller.text) != widget.value) {
      _controller.text = _format(widget.value);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  static String _format(double value) {
    final cents = (value * 100).round();
    if (cents == 0) return '';
    final reais = cents ~/ 100;
    final rest = (cents % 100).toString().padLeft(2, '0');
    return '${_thousands(reais)},$rest';
  }

  static String _thousands(int value) {
    final digits = value.toString();
    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 == 0) buffer.write('.');
      buffer.write(digits[i]);
    }
    return buffer.toString();
  }

  static double _parse(String text) {
    final digits = text.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return 0;
    return int.parse(digits) / 100;
  }

  void _handleChange(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    final capped = digits.length > 12 ? digits.substring(0, 12) : digits;
    final value = capped.isEmpty ? 0.0 : int.parse(capped) / 100;

    final formatted = _format(value);
    _controller.value = TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
    widget.onChanged(value);
  }

  @override
  Widget build(BuildContext context) {
    return LabeledField(
      label: widget.label,
      error: widget.error,
      hint: widget.hint,
      child: TextField(
        controller: _controller,
        keyboardType: const TextInputType.numberWithOptions(decimal: false),
        onChanged: _handleChange,
        style: AppText.body,
        decoration: InputDecoration(
          hintText: '0,00',
          prefixText: 'R\$ ',
          prefixStyle: AppText.body.copyWith(color: AppColors.textSecondary),
          enabledBorder: widget.error == null ? null : AppTextField._errorBorder,
          focusedBorder: widget.error == null ? null : AppTextField._errorBorder,
        ),
      ),
    );
  }
}

/// Applies the (99) 99999-9999 mask as digits are typed.
class PhoneInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final masked = maskPhone(newValue.text);
    return TextEditingValue(
      text: masked,
      selection: TextSelection.collapsed(offset: masked.length),
    );
  }
}

class SegmentedOption<T> {
  const SegmentedOption({required this.value, required this.label, this.icon});
  final T value;
  final String label;
  final IconData? icon;
}

/// A two-to-four way choice shown all at once. Preferred over a dropdown
/// where the options are few and the choice drives the rest of a form (tipo de
/// lançamento, forma de pagamento) — one tap instead of open-scan-tap.
class AppSegmentedControl<T> extends StatelessWidget {
  const AppSegmentedControl({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
    this.label,
    this.activeColor,
    this.activeBackground,
  });

  final List<SegmentedOption<T>> options;
  final T value;
  final ValueChanged<T> onChanged;
  final String? label;
  final Color? activeColor;
  final Color? activeBackground;

  @override
  Widget build(BuildContext context) {
    return LabeledField(
      label: label,
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: AppColors.bgApp,
          borderRadius: BorderRadius.circular(AppRadius.input),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: options.map((option) {
            final selected = option.value == value;
            final fg = selected ? (activeColor ?? AppColors.evergreen) : AppColors.textSecondary;
            return Expanded(
              child: Semantics(
                selected: selected,
                button: true,
                child: InkWell(
                  onTap: () => onChanged(option.value),
                  borderRadius: BorderRadius.circular(9),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    height: 38,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: selected ? (activeBackground ?? AppColors.surface) : Colors.transparent,
                      borderRadius: BorderRadius.circular(9),
                      boxShadow: selected ? AppShadows.card : null,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (option.icon != null) ...[
                          Icon(option.icon, size: 16, color: fg),
                          const SizedBox(width: 6),
                        ],
                        Flexible(
                          child: Text(
                            option.label,
                            overflow: TextOverflow.ellipsis,
                            style: AppText.bodyStrong.copyWith(color: fg),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

class SelectOption<T> {
  const SelectOption({required this.value, required this.label});
  final T value;
  final String label;
}

class AppSelect<T> extends StatelessWidget {
  const AppSelect({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
    this.label,
    this.placeholder,
    this.error,
  });

  final List<SelectOption<T>> options;
  final T? value;
  final ValueChanged<T?> onChanged;
  final String? label;
  final String? placeholder;
  final String? error;

  @override
  Widget build(BuildContext context) {
    return LabeledField(
      label: label,
      error: error,
      child: DropdownButtonFormField<T>(
        initialValue: value,
        isExpanded: true,
        style: AppText.body,
        borderRadius: BorderRadius.circular(AppRadius.input),
        icon: const Icon(Icons.expand_more_rounded, color: AppColors.textSecondary),
        hint: placeholder == null
            ? null
            : Text(placeholder!, style: AppText.body.copyWith(color: AppColors.textSecondary)),
        items: options
            .map((option) => DropdownMenuItem<T>(
                  value: option.value,
                  child: Text(option.label, overflow: TextOverflow.ellipsis),
                ))
            .toList(),
        onChanged: onChanged,
      ),
    );
  }
}

class AppCheckbox extends StatelessWidget {
  const AppCheckbox({
    super.key,
    required this.value,
    required this.onChanged,
    required this.label,
    this.hideLabel = false,
  });

  final bool value;
  final ValueChanged<bool> onChanged;
  final String label;
  final bool hideLabel;

  @override
  Widget build(BuildContext context) {
    final box = Checkbox(
      value: value,
      onChanged: (next) => onChanged(next ?? false),
      activeColor: AppColors.sageGreen,
      side: const BorderSide(color: AppColors.border, width: 2),
      shape: RoundedMenuBorder.checkboxShape,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
    );

    if (hideLabel) {
      return Semantics(
        label: label,
        child: SizedBox(width: 40, height: 40, child: Center(child: box)),
      );
    }

    return InkWell(
      onTap: () => onChanged(!value),
      borderRadius: BorderRadius.circular(AppRadius.input),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            box,
            const SizedBox(width: 6),
            Flexible(child: Text(label, style: AppText.body)),
          ],
        ),
      ),
    );
  }
}

abstract final class RoundedMenuBorder {
  static final checkboxShape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(6));
}

/// A date field that opens the platform picker and shows dd/MM/yyyy.
class DateField extends StatelessWidget {
  const DateField({
    super.key,
    required this.value,
    required this.onChanged,
    this.label,
    this.error,
    this.allowClear = false,
  });

  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;
  final String? label;
  final String? error;
  final bool allowClear;

  Future<void> _pick(BuildContext context) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: value ?? now,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 10),
      locale: const Locale('pt', 'BR'),
    );
    if (picked != null) onChanged(picked);
  }

  @override
  Widget build(BuildContext context) {
    return LabeledField(
      label: label,
      error: error,
      child: InkWell(
        onTap: () => _pick(context),
        borderRadius: BorderRadius.circular(AppRadius.input),
        child: Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.input),
            border: Border.all(color: error == null ? AppColors.border : AppColors.danger),
          ),
          child: Row(
            children: [
              const Icon(Icons.calendar_today_rounded, size: 16, color: AppColors.textSecondary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  value == null ? 'Selecionar data' : formatDate(value!),
                  style: AppText.body.copyWith(
                    color: value == null ? AppColors.textSecondary : AppColors.textPrimary,
                  ),
                ),
              ),
              if (allowClear && value != null)
                InkWell(
                  onTap: () => onChanged(null),
                  child: const Icon(Icons.close_rounded, size: 16, color: AppColors.textSecondary),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A time field for the optional due-time on a task.
class TimeField extends StatelessWidget {
  const TimeField({super.key, required this.value, required this.onChanged, this.label});

  final TimeOfDay? value;
  final ValueChanged<TimeOfDay?> onChanged;
  final String? label;

  @override
  Widget build(BuildContext context) {
    return LabeledField(
      label: label,
      child: InkWell(
        onTap: () async {
          final picked = await showTimePicker(
            context: context,
            initialTime: value ?? const TimeOfDay(hour: 9, minute: 0),
          );
          if (picked != null) onChanged(picked);
        },
        borderRadius: BorderRadius.circular(AppRadius.input),
        child: Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.input),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              const Icon(Icons.schedule_rounded, size: 16, color: AppColors.textSecondary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  value == null
                      ? 'Sem horário'
                      : '${value!.hour.toString().padLeft(2, '0')}:${value!.minute.toString().padLeft(2, '0')}',
                  style: AppText.body.copyWith(
                    color: value == null ? AppColors.textSecondary : AppColors.textPrimary,
                  ),
                ),
              ),
              if (value != null)
                InkWell(
                  onTap: () => onChanged(null),
                  child: const Icon(Icons.close_rounded, size: 16, color: AppColors.textSecondary),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class SearchField extends StatelessWidget {
  const SearchField({super.key, required this.controller, required this.onChanged, this.hintText = 'Buscar...'});

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final String hintText;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      style: AppText.body,
      decoration: InputDecoration(
        hintText: hintText,
        prefixIcon: const Icon(Icons.search_rounded, size: 18, color: AppColors.textSecondary),
        suffixIcon: controller.text.isEmpty
            ? null
            : IconButton(
                icon: const Icon(Icons.close_rounded, size: 16),
                color: AppColors.textSecondary,
                tooltip: 'Limpar busca',
                onPressed: () {
                  controller.clear();
                  onChanged('');
                },
              ),
      ),
    );
  }
}
