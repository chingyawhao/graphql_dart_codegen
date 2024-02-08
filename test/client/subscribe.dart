import 'package:test/test.dart';
import './generated/graphql.dart';

void main() {
  final graphqlSdk = GraphqlSdk(
    http: 'http://localhost:8080',
    getToken: () async => '',
  );

  test('Subscribe todo', () async {
    var changes = List<SubscribeToDo_Response_subscribeToDoChanges>.empty(growable: true);

    final subscription = graphqlSdk.SubscribeToDo(id: '0');
    (() async {
      await for (final response in subscription) {
        if (response?.subscribeToDoChanges != null) {
          changes.add(response!.subscribeToDoChanges);
        }
      }
    })();

    await graphqlSdk.UpdateToDoText(id: '0', text: 'Updating todo to test subscription');
    await Future.delayed(Duration(seconds: 1));
    await graphqlSdk.UpdateToDoText(id: '0', text: 'Updating todo to test subscription again');
    await Future.delayed(Duration(seconds: 1));
    await graphqlSdk.UpdateToDoDone(id: '0');
    await Future.delayed(Duration(seconds: 3));

    expect(
      changes,
      equals([
        predicate((todo) {
          if (todo is! SubscribeToDo_Response_subscribeToDoChanges) return false;
          expect(todo.id, '0');
          expect(todo.title, 'Try out codegen');
          expect(todo.text, 'Updating todo to test subscription');
          expect(todo.done, isFalse);
          return true;
        }),
        predicate((todo) {
          if (todo is! SubscribeToDo_Response_subscribeToDoChanges) return false;
          expect(todo.id, '0');
          expect(todo.title, 'Try out codegen');
          expect(todo.text, 'Updating todo to test subscription again');
          expect(todo.done, isFalse);
          return true;
        }),
        predicate((todo) {
          if (todo is! SubscribeToDo_Response_subscribeToDoChanges) return false;
          expect(todo.id, '0');
          expect(todo.title, 'Try out codegen');
          expect(todo.text, 'Updating todo to test subscription again');
          expect(todo.done, isTrue);
          return true;
        })
      ])
    );
  });
}
