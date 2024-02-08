import 'package:test/test.dart';
import './generated/graphql.dart';

void main() {
  final graphqlSdk = GraphqlSdk(
    http: 'http://localhost:8080',
    getToken: () async => '',
  );

  test('Display todos', () async {
    final todo = await graphqlSdk.ViewToDo();

    expect(
      todo?.displayToDos,
      equals([
        predicate((todo) {
          if (todo is! ViewToDo_Response_displayToDos) return false;
          expect(todo.id, '0');
          expect(todo.title, 'Try out codegen');
          expect(todo.text, "Let's go...");
          expect(todo.files, isEmpty);
          return true;
        })
      ])
    );
  });

  test('Add todo', () async {
    final todo = await graphqlSdk.AddToDo(
      title: 'Try out codegen mutation',
      text: "Let's do this...",
    );

    expect(
      todo?.addToDo,
      predicate((todo) {
        if (todo is! AddToDo_Response_addToDo) return false;
        expect(todo.id, isA<String>());
        expect(todo.title, 'Try out codegen mutation');
        expect(todo.text, "Let's do this...");
        expect(todo.files, isEmpty);
        return true;
      })
    );
  });
}
