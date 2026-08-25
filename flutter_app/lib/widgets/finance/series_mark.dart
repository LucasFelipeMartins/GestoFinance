import 'package:flutter/material.dart';

import '../../theme/tokens.dart';
import '../../utils/meta.dart';

/// Paints one data point.
///
/// The shape carries series identity alongside the colour — lucro (verde) and
/// gasto (vermelho) are only ΔE 7.2 apart under colour-vision deficiency, so
/// the shape is what actually tells them apart. The surface-coloured ring
/// keeps a marker legible where lines cross.
void paintSeriesMark(
  Canvas canvas,
  Offset center, {
  required SeriesShape shape,
  required Color color,
  double size = 5,
  Color surface = AppColors.surface,
}) {
  final fill = Paint()..color = color;
  final ring = Paint()
    ..color = surface
    ..style = PaintingStyle.stroke
    ..strokeWidth = 2
    ..strokeJoin = StrokeJoin.round;

  switch (shape) {
    case SeriesShape.circle:
      canvas.drawCircle(center, size, fill);
      canvas.drawCircle(center, size, ring);

    case SeriesShape.square:
      final rect = RRect.fromRectAndRadius(
        Rect.fromCenter(center: center, width: size * 2, height: size * 2),
        Radius.circular(size * 0.3),
      );
      canvas.drawRRect(rect, fill);
      canvas.drawRRect(rect, ring);

    case SeriesShape.triangle:
      final path = Path()
        ..moveTo(center.dx, center.dy - size * 1.2)
        ..lineTo(center.dx + size * 1.15, center.dy + size * 0.85)
        ..lineTo(center.dx - size * 1.15, center.dy + size * 0.85)
        ..close();
      canvas.drawPath(path, fill);
      canvas.drawPath(path, ring);
  }
}

/// The same mark at legend size, with the short stroke a line series' legend
/// key should mirror.
class SeriesMarkKey extends StatelessWidget {
  const SeriesMarkKey({
    super.key,
    required this.shape,
    required this.color,
    this.size = 12,
    this.withLine = true,
  });

  final SeriesShape shape;
  final Color color;
  final double size;
  final bool withLine;

  @override
  Widget build(BuildContext context) {
    final width = withLine ? size + 12 : size;
    return SizedBox(
      width: width,
      height: size,
      child: CustomPaint(painter: _MarkKeyPainter(shape: shape, color: color, withLine: withLine)),
    );
  }
}

class _MarkKeyPainter extends CustomPainter {
  const _MarkKeyPainter({required this.shape, required this.color, required this.withLine});

  final SeriesShape shape;
  final Color color;
  final bool withLine;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    if (withLine) {
      canvas.drawLine(
        Offset(0, center.dy),
        Offset(size.width, center.dy),
        Paint()
          ..color = color
          ..strokeWidth = 2
          ..strokeCap = StrokeCap.round,
      );
    }

    paintSeriesMark(canvas, center, shape: shape, color: color, size: size.height / 2.6);
  }

  @override
  bool shouldRepaint(_MarkKeyPainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.shape != shape || oldDelegate.withLine != withLine;
}
