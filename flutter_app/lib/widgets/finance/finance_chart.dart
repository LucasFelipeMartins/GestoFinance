import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/enums.dart';
import '../../theme/tokens.dart';
import '../../utils/finance_math.dart';
import '../../utils/formatters.dart';
import '../../utils/meta.dart';
import 'series_mark.dart';

const double _chartHeight = 288;

/// Below this the endpoint labels are dropped — the panel above the chart
/// already reports the current month, so nothing becomes unreachable.
const double _endpointLabelMinWidth = 470;

const int _tickCount = 4;

/// Rounds a value up to the next clean step. The ladder is deliberately
/// fine-grained: a coarse 1/2/5 ladder would round a R$ 2.950 step up to
/// R$ 5.000 and leave the top 40% of the plot empty.
const _niceSteps = <double>[1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

double niceCeil(double value) {
  if (value <= 0) return 0;
  final magnitude = math.pow(10, (math.log(value) / math.ln10).floor()).toDouble();
  final normalized = value / magnitude;
  final nice = _niceSteps.firstWhere((step) => normalized <= step, orElse: () => 10);
  return nice * magnitude;
}

const _visibilityKey = 'gestorpro.finance-chart-series';

/// Lucros, gastos e investimentos over the last months, one line each.
///
/// One y-axis for all three (they are all BRL, so they genuinely share a
/// scale). Each line can be switched off from the legend, and the choice is
/// remembered per device.
class FinanceChart extends StatefulWidget {
  const FinanceChart({super.key, required this.series});

  final List<MonthBucket> series;

  @override
  State<FinanceChart> createState() => _FinanceChartState();
}

class _FinanceChartState extends State<FinanceChart> {
  Map<FinanceKind, bool> _visible = {
    FinanceKind.income: true,
    FinanceKind.expense: true,
    FinanceKind.investment: true,
  };
  int? _activeIndex;
  bool _showTable = false;

  @override
  void initState() {
    super.initState();
    _restoreVisibility();
  }

  Future<void> _restoreVisibility() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_visibilityKey);
      if (raw == null || !mounted) return;
      final parsed = jsonDecode(raw) as Map<String, dynamic>;
      setState(() {
        _visible = {
          for (final kind in financeKindOrder) kind: parsed[kind.wire] as bool? ?? true,
        };
      });
    } catch (_) {
      // Storage blocked (a private window) just loses the preference.
    }
  }

  Future<void> _persistVisibility() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _visibilityKey,
        jsonEncode({for (final entry in _visible.entries) entry.key.wire: entry.value}),
      );
    } catch (_) {/* see _restoreVisibility */}
  }

  void _toggle(FinanceKind kind) {
    setState(() => _visible[kind] = !(_visible[kind] ?? true));
    _persistVisibility();
  }

  List<FinanceKind> get _activeKinds =>
      financeKindOrder.where((kind) => _visible[kind] ?? true).toList();

  void _updateActiveIndex(Offset localPosition, double width, _ChartGeometry geometry) {
    if (widget.series.length < 2 || geometry.innerWidth <= 0) return;
    final ratio = (localPosition.dx - geometry.padding.left) / geometry.innerWidth;
    final index = (ratio * (widget.series.length - 1)).round();
    final clamped = index.clamp(0, widget.series.length - 1);
    if (clamped != _activeIndex) setState(() => _activeIndex = clamped);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _header(),
        const SizedBox(height: 16),
        LayoutBuilder(builder: (context, constraints) {
          final width = constraints.maxWidth;
          final geometry = _ChartGeometry(
            width: width,
            series: widget.series,
            activeKinds: _activeKinds,
            showEndpointLabels: width >= _endpointLabelMinWidth,
          );

          return SizedBox(
            height: _chartHeight,
            child: Stack(
              children: [
                MouseRegion(
                  onHover: (event) => _updateActiveIndex(event.localPosition, width, geometry),
                  onExit: (_) => setState(() => _activeIndex = null),
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTapDown: (details) =>
                        _updateActiveIndex(details.localPosition, width, geometry),
                    onHorizontalDragUpdate: (details) =>
                        _updateActiveIndex(details.localPosition, width, geometry),
                    onHorizontalDragEnd: (_) => setState(() => _activeIndex = null),
                    child: CustomPaint(
                      size: Size(width, _chartHeight),
                      painter: _FinanceChartPainter(
                        geometry: geometry,
                        activeIndex: _activeIndex,
                      ),
                    ),
                  ),
                ),
                if (!geometry.hasData)
                  Center(
                    child: Text(
                      'Nenhum lançamento nos últimos ${widget.series.length} meses.',
                      style: AppText.body.copyWith(color: AppColors.textSecondary),
                      textAlign: TextAlign.center,
                    ),
                  ),
                if (_activeIndex != null) _tooltip(geometry, width),
              ],
            ),
          );
        }),
        const SizedBox(height: 12),
        _tableToggle(),
        if (_showTable) ...[const SizedBox(height: 12), _table()],
      ],
    );
  }

  Widget _header() {
    return LayoutBuilder(builder: (context, constraints) {
      final title = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Evolução financeira', style: AppText.h3),
          const SizedBox(height: 2),
          Text(
            'Últimos ${widget.series.length} meses · compras parceladas contam mês a mês',
            style: AppText.caption,
          ),
        ],
      );

      final legend = Wrap(
        spacing: 8,
        runSpacing: 8,
        children: financeKindOrder.map(_legendChip).toList(),
      );

      if (constraints.maxWidth < 620) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [title, const SizedBox(height: 12), legend],
        );
      }
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [Expanded(child: title), legend],
      );
    });
  }

  /// The legend doubles as the on/off control for each line.
  Widget _legendChip(FinanceKind kind) {
    final meta = financeMeta[kind]!;
    final isOn = _visible[kind] ?? true;

    return Semantics(
      button: true,
      selected: isOn,
      label: '${kind.plural}: ${isOn ? 'visível' : 'oculto'}',
      child: InkWell(
        onTap: () => _toggle(kind),
        borderRadius: BorderRadius.circular(AppRadius.badge),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
          decoration: BoxDecoration(
            color: isOn ? meta.soft : AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.badge),
            border: Border.all(color: isOn ? Colors.transparent : AppColors.border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SeriesMarkKey(
                shape: meta.shape,
                color: isOn ? meta.color : const Color(0xFF9AA396),
              ),
              const SizedBox(width: 8),
              Text(
                kind.plural,
                style: AppText.caption.copyWith(
                  fontWeight: FontWeight.w600,
                  color: isOn ? AppColors.textPrimary : AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _tooltip(_ChartGeometry geometry, double width) {
    final bucket = widget.series[_activeIndex!];
    const tooltipWidth = 190.0;
    final left = (geometry.xFor(_activeIndex!) - tooltipWidth / 2)
        .clamp(0.0, math.max(0.0, width - tooltipWidth))
        .toDouble();

    return Positioned(
      left: left,
      top: 4,
      width: tooltipWidth,
      child: IgnorePointer(
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(AppRadius.input),
            border: Border.all(color: AppColors.border),
            boxShadow: AppShadows.elevated,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                bucket.fullLabel,
                style: AppText.caption.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              if (_activeKinds.isEmpty)
                Text('Nenhuma linha ativa.', style: AppText.caption)
              else
                // Values lead, labels follow: here the reader has the series
                // and wants the number.
                for (final kind in _activeKinds) ...[
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      children: [
                        SeriesMarkKey(shape: financeMeta[kind]!.shape, color: financeMeta[kind]!.color),
                        const SizedBox(width: 6),
                        Expanded(child: Text(kind.plural, style: AppText.caption)),
                        Text(
                          formatCurrency(bucket.valueFor(kind)),
                          style: AppText.bodyStrong,
                        ),
                      ],
                    ),
                  ),
                ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _tableToggle() {
    return InkWell(
      onTap: () => setState(() => _showTable = !_showTable),
      borderRadius: BorderRadius.circular(6),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(_showTable ? Icons.expand_less_rounded : Icons.table_chart_outlined,
                size: 15, color: AppColors.sageGreen),
            const SizedBox(width: 6),
            Text(
              _showTable ? 'Ocultar tabela' : 'Ver como tabela',
              style: AppText.caption.copyWith(
                color: AppColors.sageGreen,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Every value the chart plots, reachable without hovering.
  Widget _table() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        headingRowHeight: 36,
        dataRowMinHeight: 38,
        dataRowMaxHeight: 44,
        columnSpacing: 24,
        columns: [
          const DataColumn(label: Text('Mês', style: AppText.caption)),
          for (final kind in financeKindOrder)
            DataColumn(numeric: true, label: Text(kind.plural, style: AppText.caption)),
        ],
        rows: widget.series
            .map((bucket) => DataRow(cells: [
                  DataCell(Text(bucket.fullLabel, style: AppText.body)),
                  for (final kind in financeKindOrder)
                    DataCell(Text(formatCurrency(bucket.valueFor(kind)), style: AppText.body)),
                ]))
            .toList(),
      ),
    );
  }
}

/// Everything about where things land on the canvas, shared between the
/// painter and the widget (which needs it for hit-testing and the tooltip).
class _ChartGeometry {
  _ChartGeometry({
    required this.width,
    required this.series,
    required this.activeKinds,
    required this.showEndpointLabels,
  })  : padding = EdgeInsets.only(
          top: 22,
          right: showEndpointLabels ? 84 : 14,
          bottom: 30,
          left: 58,
        ),
        step = _resolveStep(series, activeKinds);

  final double width;
  final List<MonthBucket> series;
  final List<FinanceKind> activeKinds;
  final bool showEndpointLabels;
  final EdgeInsets padding;
  final double step;

  double get innerWidth => math.max(0, width - padding.left - padding.right);
  double get innerHeight => _chartHeight - padding.top - padding.bottom;
  double get maxValue => step * _tickCount;

  bool get hasData =>
      series.any((b) => b.income != 0 || b.expense != 0 || b.investment != 0);

  double xFor(int index) => series.length <= 1
      ? padding.left + innerWidth / 2
      : padding.left + (index * innerWidth) / (series.length - 1);

  double yFor(double value) =>
      padding.top + innerHeight - (value / maxValue) * innerHeight;

  static double _resolveStep(List<MonthBucket> series, List<FinanceKind> activeKinds) {
    var rawMax = 0.0;
    for (final bucket in series) {
      for (final kind in activeKinds) {
        rawMax = math.max(rawMax, bucket.valueFor(kind));
      }
    }
    // An all-zero ledger still deserves a readable axis rather than a flat
    // line pinned to an invisible scale.
    return rawMax > 0 ? niceCeil(rawMax / _tickCount) : 250;
  }
}

class _FinanceChartPainter extends CustomPainter {
  const _FinanceChartPainter({required this.geometry, this.activeIndex});

  final _ChartGeometry geometry;
  final int? activeIndex;

  @override
  void paint(Canvas canvas, Size size) {
    _paintGrid(canvas);
    _paintMonthLabels(canvas);
    if (activeIndex != null) _paintCrosshair(canvas);
    _paintSeries(canvas);
    if (geometry.showEndpointLabels) _paintEndpointLabels(canvas);
    _paintBaseline(canvas);
  }

  /// Gridlines: solid hairlines, one shade off the surface. Never dashed —
  /// dashing reads as "projection" when it is just a grid.
  void _paintGrid(Canvas canvas) {
    final line = Paint()
      ..color = AppColors.grid
      ..strokeWidth = 1;

    for (var i = 0; i <= _tickCount; i++) {
      final value = geometry.step * i;
      final y = geometry.yFor(value);
      canvas.drawLine(
        Offset(geometry.padding.left, y),
        Offset(geometry.padding.left + geometry.innerWidth, y),
        line,
      );
      _text(
        canvas,
        value == 0 ? 'R\$ 0' : formatCompactCurrency(value),
        Offset(geometry.padding.left - 10, y),
        align: TextAlign.right,
        anchor: _Anchor.rightCenter,
      );
    }
  }

  void _paintMonthLabels(Canvas canvas) {
    for (var i = 0; i < geometry.series.length; i++) {
      _text(
        canvas,
        geometry.series[i].label,
        Offset(geometry.xFor(i), _chartHeight - 16),
        anchor: _Anchor.center,
        bold: activeIndex == i,
      );
    }
  }

  /// The crosshair finds the X — readers aim at a month, never at a 2px line.
  void _paintCrosshair(Canvas canvas) {
    final x = geometry.xFor(activeIndex!);
    canvas.drawLine(
      Offset(x, geometry.padding.top - 6),
      Offset(x, geometry.padding.top + geometry.innerHeight),
      Paint()
        ..color = AppColors.leader
        ..strokeWidth = 1,
    );
  }

  void _paintSeries(Canvas canvas) {
    for (final kind in geometry.activeKinds) {
      final meta = financeMeta[kind]!;
      final stroke = Paint()
        ..color = meta.color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round;

      final path = Path();
      for (var i = 0; i < geometry.series.length; i++) {
        final point = Offset(geometry.xFor(i), geometry.yFor(geometry.series[i].valueFor(kind)));
        if (i == 0) {
          path.moveTo(point.dx, point.dy);
        } else {
          path.lineTo(point.dx, point.dy);
        }
      }
      canvas.drawPath(path, stroke);

      for (var i = 0; i < geometry.series.length; i++) {
        paintSeriesMark(
          canvas,
          Offset(geometry.xFor(i), geometry.yFor(geometry.series[i].valueFor(kind))),
          shape: meta.shape,
          color: meta.color,
          size: activeIndex == i ? 6 : 4.5,
        );
      }
    }
  }

  /// Direct labels on the newest point, de-collided top-to-bottom with a
  /// leader line back to each marker so a nudged label still reads as its own.
  void _paintEndpointLabels(Canvas canvas) {
    if (geometry.series.isEmpty) return;
    final last = geometry.series.last;
    final lastIndex = geometry.series.length - 1;

    final placed = geometry.activeKinds
        .map((kind) => (kind: kind, value: last.valueFor(kind), y: geometry.yFor(last.valueFor(kind))))
        .toList()
      ..sort((a, b) => a.y.compareTo(b.y));

    const minGap = 16.0;
    final adjusted = <({FinanceKind kind, double value, double y})>[];
    for (final label in placed) {
      var y = label.y;
      if (adjusted.isNotEmpty && y - adjusted.last.y < minGap) {
        y = adjusted.last.y + minGap;
      }
      adjusted.add((kind: label.kind, value: label.value, y: y));
    }

    final leader = Paint()
      ..color = AppColors.leader
      ..strokeWidth = 1;

    for (final label in adjusted) {
      final markerY = geometry.yFor(label.value);
      final labelX = geometry.padding.left + geometry.innerWidth;

      if ((label.y - markerY).abs() > 2) {
        canvas.drawLine(
          Offset(geometry.xFor(lastIndex) + 7, markerY),
          Offset(labelX + 8, label.y),
          leader,
        );
      }

      _text(
        canvas,
        formatCompactCurrency(label.value),
        Offset(labelX + 12, label.y),
        anchor: _Anchor.leftCenter,
        bold: true,
      );
    }
  }

  /// Drawn last so it sits above the gridlines.
  void _paintBaseline(Canvas canvas) {
    final y = geometry.padding.top + geometry.innerHeight;
    canvas.drawLine(
      Offset(geometry.padding.left, y),
      Offset(geometry.padding.left + geometry.innerWidth, y),
      Paint()
        ..color = AppColors.axisRule
        ..strokeWidth = 1,
    );
  }

  /// Axis text always wears an ink token, never the series colour — the
  /// coloured mark beside it is what carries identity.
  void _text(
    Canvas canvas,
    String value,
    Offset position, {
    _Anchor anchor = _Anchor.center,
    TextAlign align = TextAlign.center,
    bool bold = false,
  }) {
    final painter = TextPainter(
      text: TextSpan(
        text: value,
        style: TextStyle(
          fontSize: 11,
          color: AppColors.textSecondary,
          fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
        ),
      ),
      textAlign: align,
      textDirection: TextDirection.ltr,
    )..layout();

    final offset = switch (anchor) {
      _Anchor.center => Offset(position.dx - painter.width / 2, position.dy - painter.height / 2),
      _Anchor.rightCenter => Offset(position.dx - painter.width, position.dy - painter.height / 2),
      _Anchor.leftCenter => Offset(position.dx, position.dy - painter.height / 2),
    };

    painter.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(_FinanceChartPainter oldDelegate) =>
      oldDelegate.activeIndex != activeIndex ||
      oldDelegate.geometry.width != geometry.width ||
      oldDelegate.geometry.step != geometry.step ||
      oldDelegate.geometry.activeKinds.length != geometry.activeKinds.length ||
      !identical(oldDelegate.geometry.series, geometry.series);
}

enum _Anchor { center, rightCenter, leftCenter }
