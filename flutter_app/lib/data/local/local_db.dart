import 'package:hive_ce_flutter/hive_flutter.dart';

/// The local store.
///
/// Every screen reads from here, never from the network — the sync engine is
/// the only thing that talks to the API. That is what makes the app work
/// offline on all three platforms: Hive is backed by IndexedDB on web and by
/// files on Android/iOS, and the code above it cannot tell the difference.
class LocalDb {
  LocalDb._();

  static final LocalDb instance = LocalDb._();

  static const _clients = 'clients';
  static const _tasks = 'tasks';
  static const _finance = 'finance';
  static const _goals = 'goals';
  static const _goalContributions = 'goal_contributions';
  static const _outbox = 'outbox';
  static const _meta = 'meta';

  late final Box<dynamic> clients;
  late final Box<dynamic> tasks;
  late final Box<dynamic> finance;
  late final Box<dynamic> goals;
  late final Box<dynamic> goalContributions;

  /// Auto-incrementing keys, so the queue drains in the order it was filled.
  late final Box<dynamic> outbox;
  late final Box<dynamic> meta;

  bool _ready = false;

  /// [path] opens the store from a plain directory instead of the app's
  /// documents folder — what a headless test or tool needs, since
  /// initFlutter() goes through a platform plugin that only exists in a
  /// running app.
  Future<void> init({String? path}) async {
    if (_ready) return;
    if (path == null) {
      await Hive.initFlutter();
    } else {
      Hive.init(path);
    }
    clients = await Hive.openBox<dynamic>(_clients);
    tasks = await Hive.openBox<dynamic>(_tasks);
    finance = await Hive.openBox<dynamic>(_finance);
    goals = await Hive.openBox<dynamic>(_goals);
    goalContributions = await Hive.openBox<dynamic>(_goalContributions);
    outbox = await Hive.openBox<dynamic>(_outbox);
    meta = await Hive.openBox<dynamic>(_meta);
    _ready = true;
  }

  /// Wipes all local data. Called on logout — the device is shared by whoever
  /// uses the app on it, so a second account logging in must never see the
  /// previous account's clients, tasks or finances.
  Future<void> clearAll() async {
    await Future.wait([
      clients.clear(),
      tasks.clear(),
      finance.clear(),
      goals.clear(),
      goalContributions.clear(),
      outbox.clear(),
      meta.clear(),
    ]);
  }
}

/// Hive hands maps back with dynamic keys; this narrows them once, at the
/// boundary, so nothing above has to think about it.
Map<String, dynamic> asJson(dynamic raw) => Map<String, dynamic>.from(raw as Map);

List<Map<String, dynamic>> allJson(Box<dynamic> box) =>
    box.values.map(asJson).toList(growable: false);
